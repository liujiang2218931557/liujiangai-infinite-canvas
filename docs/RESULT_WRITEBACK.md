# Image and Video Result Writeback

This document is the focused acceptance reference for the fixed `六酱 New API`
canvas channel. It contains no API key, upstream key, server credential,
Cookie, or production request payload.

## Scope

Only these seven public models are bundled into the canvas:

| Capability | New API model ID | Create route | Completion rule |
| --- | --- | --- | --- |
| Image | `firefly-gpt-image-1k-1x1` | `POST /v1/chat/completions` with SSE | Parse a returned image URL from the stream, save it, and write an image node |
| Image | `gpt-image-2` | `POST /v1/images/generations` or `/edits` | Read `data[].url` or `data[].b64_json`, save it, and write an image node |
| Image | `Adobe-gpt-image-2` | `POST /v1/images/generations` or `/edits` | Read `data[].url` or `data[].b64_json`, save it, and write an image node |
| Video | `sd-2.5-720p不卡脸(按秒)` | `POST /v1/videos` | Poll, then download playable content and write a video node |
| Video | `sd-2.5-480p不卡脸(按秒)` | `POST /v1/videos` | Poll, then download playable content and write a video node |
| Video | `sd-2.5-720p不卡脸(按次)` | `POST /v1/videos` | Fixed 15 seconds; poll, download, and write a video node |
| Video | `sd-720满血-不卡脸（按次）` | `POST /v1/videos` | Fixed 15 seconds; poll, download, and write a video node |

All requests use the current user's `Authorization: Bearer <New API Token>`
and the fixed HTTPS base URL `https://liujiangai.cn/v1`.

## Image Flow

```text
Canvas image node
  -> create image request
  -> synchronous response URL or Base64 data
  -> browser image storage
  -> canvas image metadata + preview
```

`firefly-gpt-image-*` is an SSE Chat response. If it does not include an image
URL, the canvas fails clearly and does not make a second non-streaming request:
a second request could create a second billable image. The other two image
models use synchronous `data[]` output; there is no image-task polling route
for this integration.

## Video Flow

```text
Canvas video node (loading)
  -> POST /v1/videos
  -> task ID
  -> GET /v1/videos/{task_id} every 5 seconds
  -> direct result URL OR authenticated /content download
  -> browser media storage
  -> canvas video metadata + playable preview
```

Pending values: `queued`, `pending`, `processing`, `in_progress`, `running`.

Success values: `completed`, `succeeded`, `success`, `done`, `finished`.

Failure values: `failed`, `failure`, `error`, `cancelled`, `canceled`,
`expired`, `rejected`, `blocked`, `aborted`, `timeout`, `timed_out`.

When no direct video URL is returned, or a returned New API content URL needs
authorization, the canvas requests:

```text
GET /v1/videos/{task_id}/content?variant=video
```

with the user's Bearer Token, and falls back to `/content`. It only changes the
video node to success after it receives media data and saves it. HTML/JSON/empty
content is a failure, not a preview.

## Public Reference Media

For video models that require upstream-retrievable assets, the browser uploads
image/video/audio references through the separately deployed Tencent SCF/COS
gateway, receives temporary HTTPS URLs, then sends those URLs in the model
request. The canvas never sends a `blob:` URL or a local file path to the
provider.

## Offline Verification

From `web/`:

```powershell
npm.cmd run verify:aicopy
npm.cmd run typecheck
npm.cmd run build
```

`verify:aicopy` uses only mock response objects. It proves the frontend's
request/result normalization and never contacts New API or a billable upstream.

## Live Acceptance Boundary

The frontend cannot force New API to complete a task. A real completed
writeback requires all of the following:

1. New API accepts the user's Token and has a visible model.
2. New API successfully relays the request to the configured upstream.
3. The production New API worker maps the upstream task state to a terminal
   success or failure.
4. On success, New API exposes a playable direct URL or authenticated content
   endpoint.
5. The browser stores that result and rewrites the canvas node.

As of the last audit, a previously submitted task was stuck at 30% and four
older tasks reported `upstream returned error`. Treat that as a New API/upstream
P0 until a terminal task is observed; do not issue duplicate billable requests
simply to poll it.
