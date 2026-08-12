import type { ChannelModel, ModelChannel } from "@/stores/use-config-store";

export const AICOPY_BASE_URL = "https://liujiangai.cn/v1";
export const AICOPY_CHANNEL_ID = "aicopy";
export const AICOPY_MEDIA_UPLOAD_URL = "https://1466482611-ifehsy5n9z.ap-guangzhou.tencentscf.com/upload";
// Tokens are user credentials. The gateway URL is distributed with the canvas,
// but each user enters their own upload token in the channel editor.
export const AICOPY_MEDIA_UPLOAD_TOKEN = "";

// These names are the public New API model IDs. Do not replace them with
// display aliases: New API routing, pricing, and user group permissions all
// key off the exact model ID.
const imageModels = [
    { name: "firefly-gpt-image-1k-1x1", displayName: "GPT Image2 Fast" },
    { name: "gpt-image-2", displayName: "GPT Image2 Standard" },
    { name: "Adobe-gpt-image-2", displayName: "GPT Image2 Adobe" },
] as const;

const videoModels = [
    { name: "sd-2.5-720p不卡脸(按秒)", displayName: "SD2.5 720p per second" },
    { name: "sd-2.5-480p不卡脸(按秒)", displayName: "SD2.5 480p per second" },
    { name: "sd-2.5-720p不卡脸(按次)", displayName: "SD2.5 720p per request (15 seconds)" },
    { name: "sd-720满血-不卡脸（按次）", displayName: "SD2.0 720p per request (15 seconds)" },
] as const;

const IMAGE_SCRIPT = String.raw`
const apiBase = baseUrl.replace(/\/v1\/?$/, "");
const ratio = ({"1024x1024":"1x1","1280x1024":"5x4","864x1536":"9x16","1792x768":"21x9","1536x864":"16x9","1365x1024":"4x3","1536x1024":"3x2","1024x1280":"4x5","1024x1365":"3x4","1024x1536":"2x3"}[params.size] || "1x1");
const resolution = params.size && Math.max(Number(params.size.split("x")[0]) || 1024, Number(params.size.split("x")[1]) || 1024) >= 3000 ? "4k" : params.size && Math.max(Number(params.size.split("x")[0]) || 1024, Number(params.size.split("x")[1]) || 1024) >= 1800 ? "2k" : "1k";
const chatModels = ["firefly-nano-banana-pro", "firefly-nano-banana2", "gpt-image-1"];
const isFireflyGptImage = model.startsWith("firefly-gpt-image-");
const imagePart = (url) => ({ type: "image_url", image_url: { url } });
const toUrl = (url) => typeof url === "string" && url.startsWith("/") ? apiBase + url : url;
const imageResult = (item) => item?.b64_json ? "data:image/png;base64," + item.b64_json : item?.url ? toUrl(item.url) : null;
const chatBody = { model: model === "firefly-nano-banana-pro" ? "firefly-nano-banana-pro-" + resolution + "-" + ratio : model === "firefly-nano-banana2" ? "firefly-nano-banana2-" + resolution + "-" + ratio : "firefly-gpt-image-" + resolution + "-" + ratio, messages: [{ role: "user", content: [...images.map(imagePart), { type: "text", text: prompt }] }], stream: true };
if (chatModels.includes(model) || isFireflyGptImage) {
  const raw = await request({ method: "post", url: apiBase + "/v1/chat/completions", headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" }, responseType: "text", data: chatBody });
  const text = String(raw || "");
  const urls = [...text.matchAll(/(?:!\[[^\]]*\]\()?((?:https?:\/\/|\/v1\/)[^\s)"']+)/g)].map((m) => m[1]);
  if (urls.length) return urls.map(toUrl);
  // A fallback request with stream:false would create a second billable image.
  // Keep the original request as the sole source of truth and surface a clear
  // response-format error if the upstream did not return an image URL.
  throw new Error("图片生成完成但流式响应未包含图片地址");
}
const actualModel = model === "gpt-image-1-direct" ? "gpt-image-" + resolution + "-" + ratio : model === "image2" ? "gpt-image-2" : model === "image2-adobe" ? "Adobe-gpt-image-2" : model;
const size = params.size || "1024x1024";
const common = { model: actualModel, prompt, n: params.count, size, aspect_ratio: ratio, resolution };
if (model.startsWith("豆姐")) {
  const data = await request({ method: "post", url: apiBase + "/v1/images/generations", headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" }, data: { ...common, image: images.length === 1 ? images[0] : images, sequential_image_generation: "disabled", response_format: "url", stream: false, watermark: false } });
  return (data.data || []).map(imageResult).filter(Boolean);
}
if (images.length && model.includes("香蕉")) {
  const form = new FormData(); form.set("model", actualModel); form.set("prompt", prompt);
  for (const url of images) form.append("image", await (await fetch(url)).blob(), "reference.png");
  const data = await request({ method: "post", url: apiBase + "/v1/images/edits", headers: { Authorization: "Bearer " + apiKey }, data: form });
  return (data.data || []).map(imageResult).filter(Boolean);
}
if (images.length && !model.startsWith("豆姐")) {
  const form = new FormData(); form.set("model", actualModel); form.set("prompt", prompt); form.set("n", String(params.count)); form.set("size", size); form.set("aspect_ratio", ratio); form.set("resolution", resolution);
  for (const url of images) form.append("image", await (await fetch(url)).blob(), "reference.png");
  const data = await request({ method: "post", url: apiBase + "/v1/images/edits", headers: { Authorization: "Bearer " + apiKey }, data: form });
  return (data.data || []).map((item) => item.url ? toUrl(item.url) : item.b64_json && "data:image/png;base64," + item.b64_json);
}
const data = await request({ method: "post", url: apiBase + "/v1/images/generations", headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" }, data: { ...common, response_format: "b64_json" } });
return (data.data || []).map(imageResult).filter(Boolean);
`;

const VIDEO_SCRIPT = String.raw`
const apiBase = baseUrl.replace(/\/v1\/?$/, "");
const toUrl = (url) => typeof url === "string" && url.startsWith("/") ? apiBase + url : url;
const isProtectedContentUrl = (url) => typeof url === "string" && url.startsWith(apiBase + "/v1/videos/") && /\/content(?:[?#]|$)/.test(url);
const videoResult = async (url) => isProtectedContentUrl(url)
  ? { blob: await request({ method: "get", url, headers: { Authorization: "Bearer " + apiKey }, responseType: "blob" }) }
  : { url: toUrl(url) };
const asList = (value) => Array.isArray(value) ? value : [value];
const firstUrl = (state) => [
  state?.video_url, state?.result_url, state?.url, state?.final_url,
  ...asList(state?.final_urls),
  state?.content?.video_url, state?.content?.result_url, state?.content?.url,
  state?.result?.video_url, state?.result?.result_url, state?.result?.url,
  state?.result?.final_url, ...asList(state?.result?.final_urls),
  state?.output?.video_url, state?.output?.url,
  state?.output?.result_url, state?.output?.final_url, ...asList(state?.output?.final_urls),
  state?.data?.video_url, state?.data?.result_url, state?.data?.url,
  state?.data?.final_url, ...asList(state?.data?.final_urls),
  state?.data?.content?.video_url, state?.data?.content?.result_url, state?.data?.content?.url,
  state?.data?.result?.video_url, state?.data?.result?.result_url, state?.data?.result?.url, state?.data?.result?.final_url, ...asList(state?.data?.result?.final_urls),
  state?.data?.output?.video_url, state?.data?.output?.result_url, state?.data?.output?.url, state?.data?.output?.final_url, ...asList(state?.data?.output?.final_urls),
].find((value) => typeof value === "string" && value.trim());
const firstTaskId = (state) => [
  state?.id, state?.task_id, state?.taskId, state?.request_id, state?.requestId, state?.video_id, state?.videoId, state?.job_id, state?.jobId,
  state?.data?.id, state?.data?.task_id, state?.data?.taskId, state?.data?.request_id, state?.data?.requestId, state?.data?.video_id, state?.data?.videoId, state?.data?.job_id, state?.data?.jobId,
].find((value) => typeof value === "string" && value.trim());
const taskStatus = (state) => String(state?.status || state?.state || state?.data?.status || state?.data?.state || state?.result?.status || state?.result?.state || state?.output?.status || state?.output?.state || state?.data?.result?.status || state?.data?.result?.state || state?.data?.output?.status || state?.data?.output?.state || "").toLowerCase();
const taskError = (state) => [state?.error?.message, state?.error, state?.error_message, state?.message, state?.msg, state?.data?.error?.message, state?.data?.error, state?.data?.error_message, state?.data?.message, state?.result?.error?.message, state?.result?.error, state?.output?.error?.message, state?.output?.error, state?.data?.result?.error?.message, state?.data?.result?.error, state?.data?.output?.error?.message, state?.data?.output?.error].find((value) => typeof value === "string" && value.trim()) || "AICopy 视频生成失败";
let refs = images || []; let videos = params.videoReferences || []; let audios = params.audioReferences || [];
const requiresPublicMedia = model.startsWith("sd") || model.startsWith("happyhorse") || model.includes("惊喜渠道") || model.includes("omni-fast");
if (requiresPublicMedia) {
  refs = await Promise.all(refs.map(uploadPublicMedia));
  videos = await Promise.all(videos.map(uploadPublicMedia));
  audios = await Promise.all(audios.map(uploadPublicMedia));
}
const fixedFifteenSecondModel = model === "sd-2.5-720p不卡脸(按次)" || model === "sd-720满血-不卡脸（按次）";
const seconds = fixedFifteenSecondModel ? "15" : String(params.seconds || "6"); const resolution = params.resolution || "720p";
const ratio = (() => {
  if (params.ratio && /^\d+:\d+$/.test(params.ratio)) return params.ratio;
  const [width, height] = String(params.ratio || "").split("x").map(Number);
  if (width > 0 && height > 0) {
    const divisor = (left, right) => right ? divisor(right, left % right) : left;
    const gcd = divisor(width, height);
    return (width / gcd) + ":" + (height / gcd);
  }
  return "16:9";
})();
const first = refs[0]; const last = refs[1];
const isMultiRoute = refs.length > 1 || videos.length || audios.length || model.includes("h3") || model.includes("惊喜渠道") && (refs.length > 1 || videos.length || audios.length);
let path = isMultiRoute && (model.includes("h3") || model.includes("惊喜渠道")) ? "/v1/video/generations" : "/v1/videos";
let body = { model, prompt, duration: Number(seconds), seconds, aspect_ratio: ratio, resolution };
if (model === "grok-1.0-临时接口" || model === "grok-1.5-fast-临时接口") {
  const form = new FormData(); form.set("model", model); form.set("prompt", prompt); form.set("size", ratio === "9:16" ? "720x1280" : "1280x720"); form.set("seconds", seconds); form.set("resolution_name", resolution);
  for (const url of refs) form.append("input_reference[]", await (await fetch(url)).blob(), "reference.png");
  const created = await request({ method: "post", url: apiBase + "/v1/videos", headers: { Authorization: "Bearer " + apiKey }, data: form });
  const taskId = created.id || created.task_id || created.taskId || created.data?.id || created.data?.task_id; if (!taskId) throw new Error(created.message || created.msg || "AICopy 未返回视频任务 ID");
  return await poll(() => request({ method: "get", url: apiBase + "/v1/videos/" + encodeURIComponent(taskId), headers: { Authorization: "Bearer " + apiKey } }), (state) => state.video_url || state.url ? { url: toUrl(state.video_url || state.url) } : null, { intervalMs: 5000, timeoutMs: 3600000 });
}
if (model === "grok-1.5-临时接口") body = { model, prompt, seconds, size: ratio === "9:16" ? "720x1280" : "1280x720", ...(first ? { image_url: first } : {}) };
else if (model.includes("grok-1.0-video") || model.includes("grok-video-1.5-fast") || model.includes("grok-1.0-官转") || model.includes("grok-1.0-备用") || model.includes("grok-1.5-fast-官转") || model.includes("grok-1.5-fast-备用")) body = { model, prompt, duration: Number(seconds), video_length: Number(seconds), aspect_ratio: ratio, resolution: "720p", video_config: { video_length: Number(seconds), aspect_ratio: ratio, resolution: "720p", preset: "normal" }, ...(refs.length > 1 ? { reference_images: refs } : first ? { image: first } : {}) };
else if (model.includes("GROK 1.5 Preview") || model.includes("grok-1.5-官转") || model.includes("grok-1.5-备用")) body = { model, prompt, seconds, size: ratio === "9:16" ? "720x1280" : "1280x720", ...(model.includes("备用") ? { reference_images: refs.slice(0, 1) } : first ? { images: [first, first] } : {}) };
else if (model.startsWith("happyhorse")) body = { model, prompt, parameters: { duration: Number(seconds), resolution: model.includes("1080") ? "1080P" : "720P", watermark: false, ...(model.includes("i2v") ? {} : { ratio }) }, ...(model.includes("r2v") ? { reference_images: refs } : model.includes("i2v") && first ? { image_url: first } : {}) };
else if (model.includes("h3")) body = { ...body, fps: 24, ...(refs.length ? { reference_images: refs.map((url, i) => ({ url, role: i === 0 ? "first_frame" : i === 1 ? "last_frame" : "reference_image" })), image_references: refs } : {}), ...(videos.length ? { reference_videos: videos.map((url) => ({ url })) } : {}), ...(audios.length ? { reference_audios: audios.map((url) => ({ url })) } : {}) };
else if (model.includes("ad渠道")) body = { model, prompt, input: { prompt, media: [...refs.map((url) => ({ type: "reference_image", url })), ...videos.map((url) => ({ type: "reference_video", url })), ...audios.map((url) => ({ type: "reference_audio", url }))] }, seconds, size: model.includes("480") ? "480x854" : model.includes("1080") ? "1920x1080" : "1280x720" };
else if (model.includes("omni")) body = { model, prompt, seconds: "10", aspect_ratio: ratio, ...(model.includes("编辑") ? (videos.length === 1 ? { video_url: videos[0] } : { videos }) : refs.length > 1 ? { images: refs } : first ? { first_image_url: first, ...(last ? { last_image_url: last } : {}) } : {}) };
else if (model.includes("veo")) body = { model, prompt, aspect_ratio: ratio, resolution: "720p", duration: Math.min(8, Math.max(4, Number(seconds))), generate_audio: true, ...(refs.length ? { image_urls: refs.slice(0, 2) } : {}) };
else if (model.includes("sd-2.5")) body = { model, prompt, duration: Math.min(29, Math.max(4, Number(seconds))), aspect_ratio: ratio, ...(refs.length ? { images: refs } : {}), ...(videos.length ? { videos } : {}), ...(audios.length ? { audios } : {}) };
else if (model.includes("全系按秒")) body = { model, prompt, duration: Math.min(15, Math.max(4, Number(seconds))), aspect_ratio: ratio, ...(refs.length > 1 ? { image_url: first, extra_images: refs.slice(1), extra_videos: videos, extra_audios: audios } : first ? { image_url: first, start_image_url: first } : {}) };
else if (model.startsWith("sd2-") && !model.includes("全系按秒")) body = { model, prompt, duration: Math.min(15, Math.max(4, Number(seconds))), metadata: { ratio, enableSound: params.generateAudio ? "on" : "off", modeType: refs.length > 1 ? "frames2video" : refs.length ? "image2video" : "text2video" }, ...(refs.length ? { images: refs } : {}), ...(videos.length ? { videos } : {}), ...(audios.length ? { audios } : {}) };
else if (model.includes("sd-720") && !model.includes("900")) body = {
  model,
  prompt,
  duration: 15,
  metadata: {
    ratio,
    enableSound: params.generateAudio ? "on" : "off",
    modeType: refs.length > 1 ? "frames2video" : refs.length ? "image2video" : "text2video",
  },
  ...(refs.length ? { images: refs } : {}),
  ...(videos.length ? { videos } : {}),
  ...(audios.length ? { audios } : {}),
};
else if (model.includes("sd-720满血-900")) body = { model, prompt, duration: "15", aspect_ratio: ratio, resolution: "720p", reference_images: refs.map((url) => ({ url })) };
else if (model.includes("可灵-3.0") && isMultiRoute) body = { model, prompt, duration: Number(seconds), resolution, aspect_ratio: ratio, n: 1, images: refs, video_references: videos, audio_references: audios };
else if (model.includes("快乐马1.1（不卡脸）惊喜") || model.includes("可灵-3.0")) body = { model, prompt, seconds, size: resolution, aspect_ratio: ratio, n: 1, ...(first ? { input_reference: { image_url: first } } : {}) };
else if (refs.length > 1 || videos.length || audios.length) body = { ...body, image_references: refs, video_references: videos, audio_references: audios };
else if (first) body = { ...body, input_reference: { image_url: first } };
const created = await request({ method: "post", url: apiBase + path, headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" }, data: body });
const taskId = firstTaskId(created);
const direct = firstUrl(created);
if (direct) return await videoResult(toUrl(direct));
if (!taskId) throw new Error(created.message || created.msg || "AICopy 未返回视频任务 ID");
const queryPath = path + "/" + encodeURIComponent(taskId);
return await poll(() => request({ method: "get", url: apiBase + queryPath, headers: { Authorization: "Bearer " + apiKey } }), async (state) => {
  const url = firstUrl(state);
  if (url) return await videoResult(toUrl(url));
  const status = taskStatus(state);
  if (["failed", "failure", "error", "cancelled", "canceled", "expired", "rejected", "blocked", "aborted", "timeout", "timed_out"].includes(status)) throw new Error(taskError(state));
  if (["completed", "succeeded", "success", "done", "finished"].includes(status)) {
    // SD 2.5 and SD 2.0 expose the completed MP4 through the documented
    // variant endpoint. Keep the plain endpoint as a compatibility fallback.
    let content;
    try {
      content = await request({ method: "get", url: apiBase + "/v1/videos/" + encodeURIComponent(taskId) + "/content?variant=video", headers: { Authorization: "Bearer " + apiKey }, responseType: "blob" });
    } catch {
      content = await request({ method: "get", url: apiBase + "/v1/videos/" + encodeURIComponent(taskId) + "/content", headers: { Authorization: "Bearer " + apiKey }, responseType: "blob" });
    }
    return { blob: content };
  }
  return null;
}, { intervalMs: 5000, timeoutMs: 3600000 });
`;

export const aicopyImageModels: ChannelModel[] = imageModels.map((model) => ({ ...model, capability: "image", script: IMAGE_SCRIPT }));
export const aicopyVideoModels: ChannelModel[] = videoModels.map((model) => ({ ...model, capability: "video", script: VIDEO_SCRIPT }));
export const aicopyChannel: ModelChannel = {
    id: AICOPY_CHANNEL_ID,
    name: "六酱 New API",
    baseUrl: AICOPY_BASE_URL,
    apiKey: "",
    apiFormat: "openai",
    mediaUploadUrl: AICOPY_MEDIA_UPLOAD_URL,
    mediaUploadToken: AICOPY_MEDIA_UPLOAD_TOKEN,
    models: [...aicopyImageModels, ...aicopyVideoModels],
};
