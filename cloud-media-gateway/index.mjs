import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import COS from "cos-nodejs-sdk-v5";

const required = ["COS_BUCKET", "COS_REGION", "MEDIA_GATEWAY_USERS_JSON"].filter((name) => !process.env[name]);
if (required.length) throw new Error(`Missing environment variables: ${required.join(", ")}`);

const longLivedCredentials = process.env.COS_SECRET_ID && process.env.COS_SECRET_KEY
    ? { SecretId: process.env.COS_SECRET_ID, SecretKey: process.env.COS_SECRET_KEY }
    : undefined;
const serviceRoleCredentials = process.env.TENCENTCLOUD_SECRETID && process.env.TENCENTCLOUD_SECRETKEY
    ? {
          SecretId: process.env.TENCENTCLOUD_SECRETID,
          SecretKey: process.env.TENCENTCLOUD_SECRETKEY,
          SecurityToken: process.env.TENCENTCLOUD_SESSIONTOKEN,
      }
    : undefined;
const cos = new COS(longLivedCredentials || serviceRoleCredentials || {});
const users = JSON.parse(process.env.MEDIA_GATEWAY_USERS_JSON);
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 100 * 1024 * 1024);
const defaultDailyBytes = Number(process.env.DEFAULT_DAILY_BYTES || 5 * 1024 * 1024 * 1024);
const urlExpirySeconds = Math.min(Math.max(Number(process.env.SIGNED_URL_TTL_SECONDS || 86400), 300), 604800);
const chunkSize = Math.min(Math.max(Number(process.env.UPLOAD_CHUNK_BYTES || 3 * 1024 * 1024), 1024 * 1024), 4 * 1024 * 1024);
const sessionTtlMs = 60 * 60 * 1000;

function response(statusCode, body, headers = {}) {
    return { statusCode, headers: { "Content-Type": "application/json; charset=utf-8", ...headers }, body: JSON.stringify(body) };
}

function cors(event) {
    const origin = event.headers?.origin || event.headers?.Origin || "*";
    return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
}

function fail(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
}

function authorize(event) {
    const supplied = String(event.headers?.authorization || event.headers?.Authorization || "").replace(/^Bearer\s+/i, "");
    return users.find((user) => user?.id && typeof user.token === "string" && supplied.length === user.token.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(user.token)));
}

function readJson(event) {
    const raw = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8").toString("utf8");
    try {
        const value = JSON.parse(raw);
        if (!value || typeof value !== "object" || Array.isArray(value)) fail("Request body must be a JSON object.");
        return value;
    } catch (error) {
        if (error?.statusCode) throw error;
        fail("Request body must be valid JSON.");
    }
}

function callCos(method, params) {
    return new Promise((resolve, reject) => cos[method](params, (error, data) => (error ? reject(error) : resolve(data))));
}

async function usedToday(userId, date) {
    let marker;
    let bytes = 0;
    const prefix = `infinite-canvas/references/${userId}/${date}/`;
    do {
        const page = await callCos("getBucket", { Bucket: process.env.COS_BUCKET, Region: process.env.COS_REGION, Prefix: prefix, Marker: marker, MaxKeys: 1000 });
        bytes += (page.Contents || []).reduce((total, item) => total + Number(item.Size || 0), 0);
        marker = page.IsTruncated === "true" ? page.NextMarker : undefined;
    } while (marker);
    return bytes;
}

function extension(filename) {
    const raw = typeof filename === "string" && filename.includes(".") ? filename.split(".").pop() : "";
    return raw && /^[a-z0-9]{1,10}$/i.test(raw) ? `.${raw.toLowerCase()}` : "";
}

function encodeSession(user, state) {
    const payload = Buffer.from(JSON.stringify({ ...state, userId: user.id, expiresAt: Date.now() + sessionTtlMs })).toString("base64url");
    const signature = createHmac("sha256", user.token).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}

function decodeSession(user, value) {
    const [payload, signature, extra] = String(value || "").split(".");
    if (!payload || !signature || extra) fail("Invalid upload session.", 401);
    const expected = createHmac("sha256", user.token).update(payload).digest("base64url");
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) fail("Invalid upload session.", 401);
    try {
        const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (state.userId !== user.id || !state.key?.startsWith(`infinite-canvas/references/${user.id}/`) || Date.now() > Number(state.expiresAt)) fail("Upload session expired.", 401);
        return state;
    } catch (error) {
        if (error?.statusCode) throw error;
        fail("Invalid upload session.", 401);
    }
}

async function initUpload(user, body) {
    const size = Number(body.size);
    if (!Number.isSafeInteger(size) || size <= 0) fail("Invalid file size.");
    if (size > maxUploadBytes) fail(`File exceeds the ${maxUploadBytes} byte limit.`, 413);
    const contentType = typeof body.contentType === "string" && /^[\w.+-]+\/[\w.+-]+$/.test(body.contentType) ? body.contentType : "application/octet-stream";
    const date = new Date().toISOString().slice(0, 10);
    const dailyLimit = Number(user.dailyBytes || defaultDailyBytes);
    if (size + (await usedToday(user.id, date)) > dailyLimit) fail("Daily upload quota exceeded.", 429);
    const key = `infinite-canvas/references/${user.id}/${date}/${randomUUID()}${extension(body.filename)}`;
    const initialized = await callCos("multipartInit", { Bucket: process.env.COS_BUCKET, Region: process.env.COS_REGION, Key: key, ContentType: contentType });
    const state = { key, uploadId: initialized.UploadId, size, contentType, date };
    return { action: "init", uploadId: initialized.UploadId, session: encodeSession(user, state), chunkSize, parts: Math.ceil(size / chunkSize) };
}

async function uploadPart(user, body) {
    const state = decodeSession(user, body.session);
    const partNumber = Number(body.partNumber);
    const partCount = Math.ceil(state.size / chunkSize);
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > partCount) fail("Invalid upload part number.");
    const dataBase64 = String(body.data || "");
    if (!dataBase64 || dataBase64.length > Math.ceil(chunkSize / 3) * 4 + 8 || !/^[A-Za-z0-9+/]*={0,2}$/.test(dataBase64)) fail("Invalid upload part data.");
    const data = Buffer.from(dataBase64, "base64");
    const expectedBytes = partNumber === partCount ? state.size - chunkSize * (partCount - 1) : chunkSize;
    if (data.length !== expectedBytes) fail(`Upload part ${partNumber} has an invalid size.`);
    const uploaded = await callCos("multipartUpload", { Bucket: process.env.COS_BUCKET, Region: process.env.COS_REGION, Key: state.key, UploadId: state.uploadId, PartNumber: partNumber, Body: data });
    if (!uploaded.ETag) fail("COS did not return an ETag for the uploaded part.", 502);
    return { action: "part", partNumber, etag: uploaded.ETag };
}

async function completeUpload(user, body) {
    const state = decodeSession(user, body.session);
    const partCount = Math.ceil(state.size / chunkSize);
    const parts = Array.isArray(body.parts) ? body.parts.map((part) => ({ PartNumber: Number(part.partNumber), ETag: String(part.etag || "") })) : [];
    if (parts.length !== partCount || parts.some((part, index) => part.PartNumber !== index + 1 || !part.ETag)) fail("Upload parts are incomplete or out of order.");
    await callCos("multipartComplete", { Bucket: process.env.COS_BUCKET, Region: process.env.COS_REGION, Key: state.key, UploadId: state.uploadId, Parts: parts });
    const metadata = await callCos("headObject", { Bucket: process.env.COS_BUCKET, Region: process.env.COS_REGION, Key: state.key });
    const actualBytes = Number(metadata.headers?.["content-length"] || metadata.headers?.["Content-Length"] || 0);
    const dailyLimit = Number(user.dailyBytes || defaultDailyBytes);
    if (actualBytes !== state.size || (await usedToday(user.id, state.date)) > dailyLimit) {
        await callCos("deleteObject", { Bucket: process.env.COS_BUCKET, Region: process.env.COS_REGION, Key: state.key }).catch(() => undefined);
        fail(actualBytes !== state.size ? "Uploaded object size verification failed." : "Daily upload quota exceeded.", actualBytes !== state.size ? 400 : 429);
    }
    const signed = await callCos("getObjectUrl", { Bucket: process.env.COS_BUCKET, Region: process.env.COS_REGION, Key: state.key, Sign: true, Expires: urlExpirySeconds });
    return { action: "complete", url: signed.Url, expiresIn: urlExpirySeconds, bytes: actualBytes };
}

async function abortUpload(user, body) {
    const state = decodeSession(user, body.session);
    await callCos("multipartAbort", { Bucket: process.env.COS_BUCKET, Region: process.env.COS_REGION, Key: state.key, UploadId: state.uploadId });
    return { action: "abort", aborted: true };
}

export async function main_handler(event) {
    const headers = cors(event);
    const method = event.httpMethod || event.requestContext?.http?.method || event.requestContext?.httpMethod || "";
    const path = event.path || event.rawPath || event.requestContext?.http?.path || "";
    if (method === "OPTIONS") return { statusCode: 204, headers, body: "" };
    if (method !== "POST" || path !== "/upload") return response(404, { error: "Not found" }, headers);
    const user = authorize(event);
    if (!user) return response(401, { error: "Invalid upload token" }, headers);
    try {
        const body = readJson(event);
        const result = body.action === "init" ? await initUpload(user, body) : body.action === "part" ? await uploadPart(user, body) : body.action === "complete" ? await completeUpload(user, body) : body.action === "abort" ? await abortUpload(user, body) : fail("Unknown upload action.");
        return response(200, result, headers);
    } catch (error) {
        return response(Number(error?.statusCode) || 400, { error: error instanceof Error ? error.message : "Upload failed" }, headers);
    }
}
