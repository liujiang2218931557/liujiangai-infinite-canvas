# Operations Runbook

## Canvas Does Not Start on Windows

1. In the repository root, run `node --version`, `npm.cmd --version`, and `git --version`.
2. Install Node.js 22 LTS and Git for Windows if any command is absent; reopen PowerShell.
3. Run `powershell -ExecutionPolicy Bypass -File .\scripts\windows-verify.ps1`.
4. If port 3000 is busy, stop the existing local process or run Vite with a different `--port`.
5. Do not use `npm` if PowerShell blocks `npm.ps1`; use `npm.cmd` exactly as documented.

## Browser Reports CORS, 401, or No Models

1. Confirm the bundled channel still shows `https://liujiangai.cn/v1`.
2. Confirm the user pasted their own New API Token, not a website password or administrator/upstream credential.
3. Check the New API user account for Token validity, expiry, model group, balance, and quota.
4. From the browser developer tools, inspect the `OPTIONS` and `GET /v1/models` response status. Never paste the Authorization header into an issue or chat.
5. If the error is a CORS preflight failure, adjust New API/Nginx CORS for the actual canvas origin, then retest without loosening credential exposure unnecessarily.

## Video Input Cannot Be Read by the Provider

1. Use the optional HTTPS media gateway only when the selected model needs public image/video/audio URLs.
2. Confirm its per-user upload token and temporary signed URL have not expired.
3. Check SCF logs and COS prefix policy; do not put COS credentials in canvas settings.
4. Verify the provider can fetch the returned HTTPS URL before changing model scripts.

## Upstream Timeout or 5xx

1. Check the New API administrator dashboard for channel health, rate limits, and the relevant upstream error.
2. Do not change the browser's fixed New API URL to bypass New API accounting or routing.
3. Record the model name, timestamp, status, and New API request identifier without copying user tokens.
4. Retry only according to the upstream's idempotency and billing rules; video creation may not be safe to blindly retry.

## Video Stays at 30% or Never Writes Back

1. Open New API's task log and filter by the public task ID. Record the model,
   status, progress, channel ID, time, and visible error only. Do not copy a
   Token, upstream Key, Cookie, password, or request authorization header.
2. If New API remains `in progress` with a fixed progress value, the canvas is
   correctly continuing to poll. Inspect the New API deployment's async task
   polling setting and service logs, then compare the upstream response status
   with the New API video task adaptor's terminal-status mapping.
3. If New API says `failed` with `upstream returned error`, fix the selected
   New API channel/upstream request before changing the canvas. A browser
   change cannot turn an upstream failure into a playable video.
4. If New API is terminal-success but the canvas reports a download failure,
   manually check the authenticated `GET /v1/videos/{task_id}/content?variant=video`
   route. It must return a video body, not an HTML/JSON error. The canvas falls
   back to `/content` only when the variant endpoint fails.
5. Only after a terminal success plus playable content should the video node
   be marked successful. The canvas stores the returned Blob in browser media
   storage and then rewrites the node metadata for preview.

## Image Does Not Return to the Canvas

1. In New API's drawing/general logs, confirm the image request reached the
   expected model and inspect the visible error/status.
2. The exposed models are synchronous; their success response must contain a
   nonempty `data[]` entry with `url` or `b64_json`. There is no image task
   polling route in this integration.
3. For `firefly-gpt-image-*`, New API must emit an image URL in the SSE Chat
   response. The canvas deliberately does not send a second non-streaming
   request, because that could create and bill a duplicate image.
4. For `gpt-image-2` and `Adobe-gpt-image-2`, use `/v1/images/generations`
   for text-to-image and `/v1/images/edits` for reference-image editing. A
   completed response is saved to browser storage before node writeback.

## Rollback

1. For browser changes, revert the relevant Git commit and rebuild the static web bundle.
2. For an SCF gateway deployment, publish the previous function version; do not delete COS objects as part of code rollback.
3. For a compromised user Token, revoke it in New API, then create a replacement. A Git rollback cannot revoke a live Token.
