import "dotenv/config";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import Busboy from "busboy";
import COS from "cos-nodejs-sdk-v5";

const port = Number(process.env.PORT || 8787);
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean));
const token = process.env.MEDIA_GATEWAY_TOKEN || "";
const required = ["COS_SECRET_ID", "COS_SECRET_KEY", "COS_BUCKET", "COS_REGION"].filter((name) => !process.env[name]);
if (required.length) throw new Error(`Missing required environment variables: ${required.join(", ")}`);

const cos = new COS({ SecretId: process.env.COS_SECRET_ID, SecretKey: process.env.COS_SECRET_KEY });
const signExpirySeconds = Math.min(Math.max(Number(process.env.SIGNED_URL_TTL_SECONDS || 86400), 60), 604800);

function send(response, status, body) {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(body));
}

function setCors(request, response) {
    const origin = request.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Vary", "Origin");
        response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
        response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    }
}

function isAuthorized(request) {
    if (!token) return true;
    const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
    return supplied.length === token.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
}

function receiveFile(request) {
    return new Promise((resolve, reject) => {
        const contentType = request.headers["content-type"] || "";
        if (!contentType.startsWith("multipart/form-data")) return reject(new Error("Use multipart/form-data with a file field."));
        const parser = Busboy({ headers: request.headers, limits: { files: 1, fileSize: 100 * 1024 * 1024 } });
        let file = null;
        parser.on("file", (name, stream, info) => {
            if (name !== "file") return stream.resume();
            const chunks = [];
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("limit", () => reject(new Error("File exceeds the 100 MB limit.")));
            stream.on("end", () => {
                file = { body: Buffer.concat(chunks), contentType: info.mimeType || "application/octet-stream", filename: info.filename || "reference" };
            });
        });
        parser.on("error", reject);
        parser.on("finish", () => (file ? resolve(file) : reject(new Error("Missing file field."))));
        request.pipe(parser);
    });
}

function putObject(params) {
    return new Promise((resolve, reject) => cos.putObject(params, (error, data) => (error ? reject(error) : resolve(data))));
}

function signedUrl(key) {
    return new Promise((resolve, reject) => cos.getObjectUrl({ Bucket: process.env.COS_BUCKET, Region: process.env.COS_REGION, Key: key, Sign: true, Expires: signExpirySeconds }, (error, data) => (error ? reject(error) : resolve(data.Url))));
}

createServer(async (request, response) => {
    setCors(request, response);
    if (request.method === "OPTIONS") return response.writeHead(204).end();
    if (request.url === "/health") return send(response, 200, { ok: true });
    if (request.method !== "POST" || request.url !== "/upload") return send(response, 404, { error: "Not found" });
    if (!isAuthorized(request)) return send(response, 401, { error: "Unauthorized" });
    try {
        const file = await receiveFile(request);
        const extension = file.filename.includes(".") ? `.${file.filename.split(".").pop().replace(/[^a-zA-Z0-9]/g, "")}` : "";
        const key = `infinite-canvas/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
        await putObject({ Bucket: process.env.COS_BUCKET, Region: process.env.COS_REGION, Key: key, Body: file.body, ContentType: file.contentType, ACL: "private" });
        send(response, 200, { url: await signedUrl(key), expiresIn: signExpirySeconds });
    } catch (error) {
        send(response, 400, { error: error instanceof Error ? error.message : "Upload failed" });
    }
}).listen(port, "127.0.0.1", () => console.log(`COS media gateway listening on http://127.0.0.1:${port}`));
