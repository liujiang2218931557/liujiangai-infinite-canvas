import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const source = await readFile(resolve(scriptDir, "../src/services/api/aicopy.ts"), "utf8");

function sourceTemplate(name) {
    const startMarker = `const ${name} = String.raw\``;
    const start = source.indexOf(startMarker);
    assert.notEqual(start, -1, `${name} template was not found`);
    const bodyStart = start + startMarker.length;
    const end = source.indexOf("\n`;", bodyStart);
    assert.notEqual(end, -1, `${name} template end was not found`);
    return source.slice(bodyStart, end);
}

async function execute(script, { model, prompt = "test prompt", images = [], params = {}, request, uploadPublicMedia = async (value) => value, poll, fetchImpl = globalThis.fetch }) {
    const runner = new Function("prompt", "images", "params", "model", "baseUrl", "apiKey", "request", "uploadPublicMedia", "poll", "fetch", `"use strict"; return (async () => {\n${script}\n})();`);
    return runner(prompt, images, params, model, "https://liujiangai.cn/v1", "test-user-token", request, uploadPublicMedia, poll, fetchImpl);
}

async function sequentialPoll(request, extract) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
        const value = await extract(await request());
        if (value !== null && value !== undefined && value !== false) return value;
    }
    throw new Error("mock polling never completed");
}

const imageScript = sourceTemplate("IMAGE_SCRIPT");
const videoScript = sourceTemplate("VIDEO_SCRIPT");

{
    const calls = [];
    const result = await execute(imageScript, {
        model: "firefly-gpt-image-1k-1x1",
        params: { size: "1024x1024", count: 1 },
        request: async (request) => {
            calls.push(request);
            return 'data: {"choices":[{"delta":{"content":"![image](https://cdn.example.test/fast.png)"}}]}\n\ndata: [DONE]';
        },
    });
    assert.deepEqual(result, ["https://cdn.example.test/fast.png"]);
    assert.equal(calls.length, 1, "stream image routes must not retry with a second billable request");
    assert.equal(calls[0].url, "https://liujiangai.cn/v1/chat/completions");
    assert.equal(calls[0].headers.Authorization, "Bearer test-user-token");
}

{
    const result = await execute(imageScript, {
        model: "firefly-gpt-image-1k-1x1",
        params: { size: "1024x1024", count: 1 },
        request: async () => 'data: {"choices":[{"delta":{"content":"![image](/v1/files/fast.png)"}}]}\n\ndata: [DONE]',
    });
    assert.deepEqual(result, ["https://liujiangai.cn/v1/files/fast.png"], "relative chat image URLs must remain on New API HTTPS");
}

for (const status of ["completed", "succeeded", "success", "done", "finished"]) {
    const calls = [];
    const result = await execute(videoScript, {
        model: "sd-2.5-720p不卡脸(按秒)",
        params: { seconds: "6", ratio: "16:9" },
        poll: sequentialPoll,
        request: async (request) => {
            calls.push(request);
            if (request.method === "post") return { id: `task-${status}` };
            if (request.url.includes("/content?variant=video")) return new Blob(["mp4"], { type: "video/mp4" });
            return { id: `task-${status}`, status };
        },
    });
    assert.ok(result.blob instanceof Blob, `${status} must download authenticated content before writeback`);
    assert.equal(calls.find((call) => call.url.includes("/content?variant=video")).headers.Authorization, "Bearer test-user-token");
}

for (const model of ["gpt-image-2", "Adobe-gpt-image-2"]) {
    const calls = [];
    const result = await execute(imageScript, {
        model,
        params: { size: "1536x864", count: 1 },
        request: async (request) => {
            calls.push(request);
            return { data: [{ url: `https://cdn.example.test/${encodeURIComponent(model)}.png` }] };
        },
    });
    assert.equal(result[0], `https://cdn.example.test/${encodeURIComponent(model)}.png`);
    assert.equal(calls[0].url, "https://liujiangai.cn/v1/images/generations");
    assert.equal(calls[0].data.model, model);
}

for (const model of ["gpt-image-2", "Adobe-gpt-image-2"]) {
    const result = await execute(imageScript, {
        model,
        params: { size: "1536x864", count: 1 },
        request: async () => ({ data: [{ url: "/v1/files/fallback.png", b64_json: "ZmFrZS1wbmc=" }] }),
    });
    assert.equal(result[0], "data:image/png;base64,ZmFrZS1wbmc=", `${model} must preserve Base64 image results for canvas writeback`);
}

for (const model of ["gpt-image-2", "Adobe-gpt-image-2"]) {
    const calls = [];
    const result = await execute(imageScript, {
        model,
        images: ["https://assets.example.test/reference.png"],
        params: { size: "1536x864", count: 1 },
        fetchImpl: async () => ({ blob: async () => new Blob(["image"], { type: "image/png" }) }),
        request: async (request) => {
            calls.push(request);
            return { data: [{ url: "https://cdn.example.test/edit.png" }] };
        },
    });
    assert.equal(result[0], "https://cdn.example.test/edit.png");
    assert.equal(calls[0].url, "https://liujiangai.cn/v1/images/edits");
    assert.equal(calls[0].data.get("model"), model);
    assert.equal(calls[0].data.getAll("image").length, 1);
}

for (const model of ["sd-2.5-720p不卡脸(按秒)", "sd-2.5-480p不卡脸(按秒)"]) {
    const calls = [];
    let queryCount = 0;
    const result = await execute(videoScript, {
        model,
        params: { seconds: "6", ratio: "16:9", resolution: "720p" },
        poll: sequentialPoll,
        request: async (request) => {
            calls.push(request);
            if (request.method === "post") return { id: "task-seedance" };
            if (request.url.endsWith("/content?variant=video")) return new Blob(["mp4"], { type: "video/mp4" });
            queryCount += 1;
            return queryCount === 1 ? { id: "task-seedance", status: "in_progress" } : { id: "task-seedance", status: "completed" };
        },
    });
    assert.ok(result.blob instanceof Blob);
    assert.equal(calls[0].data.duration, 6);
    assert.equal(calls[0].data.aspect_ratio, "16:9");
    assert.equal(calls.find((call) => call.url.endsWith("/content?variant=video")).headers.Authorization, "Bearer test-user-token");
}

for (const pendingStatus of ["queued", "pending", "processing", "in_progress", "running"]) {
    const calls = [];
    let queryCount = 0;
    const result = await execute(videoScript, {
        model: "sd-2.5-720p不卡脸(按秒)",
        params: { seconds: "6", ratio: "16:9" },
        poll: sequentialPoll,
        request: async (request) => {
            calls.push(request);
            if (request.method === "post") return { id: `task-${pendingStatus}` };
            if (request.url.includes("/content?variant=video")) return new Blob(["mp4"], { type: "video/mp4" });
            queryCount += 1;
            return queryCount === 1 ? { id: `task-${pendingStatus}`, status: pendingStatus } : { id: `task-${pendingStatus}`, status: "completed" };
        },
    });
    assert.ok(result.blob instanceof Blob, `${pendingStatus} must remain polling until a terminal state`);
    assert.equal(calls.filter((call) => call.url.endsWith(`/videos/task-${pendingStatus}`)).length, 2);
}

for (const model of ["sd-2.5-720p不卡脸(按次)", "sd-720满血-不卡脸（按次）"]) {
    const calls = [];
    const result = await execute(videoScript, {
        model,
        images: ["data:image/png;base64,AA==", "data:image/png;base64,BB=="],
        params: {
            seconds: "4",
            ratio: "9:16",
            resolution: "720p",
            videoReferences: ["data:video/mp4;base64,AA=="],
            audioReferences: ["data:audio/mpeg;base64,AA=="],
        },
        poll: sequentialPoll,
        uploadPublicMedia: async (value) => `https://media.example.test/${encodeURIComponent(value.slice(0, 18))}`,
        request: async (request) => {
            calls.push(request);
            if (request.method === "post") return { id: "task-fixed" };
            if (request.url.endsWith("/content?variant=video")) return new Blob(["mp4"], { type: "video/mp4" });
            return { id: "task-fixed", status: "completed" };
        },
    });
    assert.ok(result.blob instanceof Blob);
    if (model.startsWith("sd-2.5")) {
        assert.equal(calls[0].data.duration, 15);
        assert.equal(calls[0].data.images.length, 2);
        assert.equal(calls[0].data.videos.length, 1);
        assert.equal(calls[0].data.audios.length, 1);
    } else {
        assert.equal(calls[0].data.seconds, "15");
        assert.equal(calls[0].data.reference_image_urls.length, 2);
        assert.equal(calls[0].data.reference_videos.length, 1);
        assert.equal(calls[0].data.reference_audios.length, 1);
    }
}

{
    const calls = [];
    const result = await execute(videoScript, {
        model: "sd-2.5-720p不卡脸(按秒)",
        params: { seconds: "6", ratio: "16:9" },
        poll: sequentialPoll,
        request: async (request) => {
            calls.push(request);
            return request.method === "post" ? { id: "task-protected" } : request.url.includes("/content") ? new Blob(["mp4"], { type: "video/mp4" }) : { id: "task-protected", status: "completed", video_url: "/v1/videos/task-protected/content" };
        },
    });
    assert.ok(result.blob instanceof Blob, "protected New API content must be downloaded before canvas writeback");
    const content = calls.find((call) => call.url.endsWith("/content"));
    assert.equal(content.headers.Authorization, "Bearer test-user-token");
}

{
    const calls = [];
    const result = await execute(videoScript, {
        model: "sd-2.5-720p不卡脸(按秒)",
        params: { seconds: "6", ratio: "16:9" },
        poll: sequentialPoll,
        request: async (request) => {
            calls.push(request);
            if (request.method === "post") return { data: { request_id: "task-nested" } };
            if (request.url.endsWith("/content")) return new Blob(["mp4"], { type: "video/mp4" });
            return { data: { state: "done", final_urls: ["/v1/videos/task-nested/content"] } };
        },
    });
    assert.ok(result.blob instanceof Blob, "nested task IDs and protected result URLs must resolve to a blob");
    const content = calls.find((call) => call.url.endsWith("/content"));
    assert.equal(content.headers.Authorization, "Bearer test-user-token");
}

for (const status of ["failed", "failure", "error", "cancelled", "canceled", "expired", "rejected", "blocked", "aborted", "timeout", "timed_out"]) {
    await assert.rejects(
        () =>
            execute(videoScript, {
                model: "sd-2.5-720p不卡脸(按秒)",
                params: { seconds: "6", ratio: "16:9" },
                poll: sequentialPoll,
                request: async (request) => (request.method === "post" ? { id: `task-${status}` } : { id: `task-${status}`, status, error: { message: "upstream returned error" } }),
            }),
        /upstream returned error/,
    );
}

console.log("AICopy adapter contract verification passed");
