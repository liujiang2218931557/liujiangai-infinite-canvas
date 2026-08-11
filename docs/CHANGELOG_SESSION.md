# Session Change Log

## 2026-08-12

### New API canvas integration

- Added a built-in `六酱 New API` channel at `https://liujiangai.cn/v1`.
- Kept the canvas as a static browser client: users register, recharge, and create their own ordinary New API Token in New API; the browser then uses that Token for model calls.
- Locked the bundled channel's Base URL and request format so it cannot silently fall back to an old IP address or legacy upstream domain.
- Added image/video request scripts and optional public-media handling for the selected relay APIs.
- Prevented secret-bearing fields from configuration transfer: user API keys, WebDAV passwords, and upload tokens are not exported; upload tokens are session-only.

### Documentation and reproducibility

- Added New API integration, external source, Windows reproduction, current-state, handoff, architecture, runbook, and backlog documents.
- Recorded the reviewed New API source contract without copying AGPL New API code into this MIT canvas repository.
- Added root and Tencent SCF environment examples containing names and fake placeholders only.

### Windows dependency reliability

- Added `.nvmrc` with Node 22 and `scripts/windows-verify.ps1`.
- Removed `@ant-design/pro-components`, whose published peer dependency conflicts with the project's Ant Design 6 version. Its one wrapper component was replaced by the already-present Ant Design `ConfigProvider`.
- Pinned `@ant-design/icons-svg` to `4.4.1` because the newer package artifact used during verification lacked runtime JavaScript files required by Vite.
- Verified clean `npm.cmd ci`, TypeScript checking, production build, and local development HTTP response on Windows.

### Deliberately not done

- No real user Token, administrator credential, upstream key, server password, COS secret, cookie, or paid API request was used or committed.
- No production CORS tightening or payment/channel configuration was changed in New API.

### Video relay diagnosis and compatibility

- Confirmed that the canvas symptom "the model script did not return video" is downstream of a New API task failure: the New API task log recorded three `sd-2.5-720p` canvas jobs as `upstream returned error`.
- Confirmed that an AICopy dashboard can show a completed video while the corresponding New API task is failed; the task IDs must be correlated before changing New API's server-side task adaptor.
- Updated the canvas video adapter to recognize common nested completed-result URL envelopes and to request the documented SD result endpoint `GET /v1/videos/{task_id}/content?variant=video`, with the old content endpoint retained as a fallback.
- Added a local 5,000-character Seedance 2.5 final-prompt guard. The guard uses the prompt after connected text/context has been assembled and does not silently truncate creative input.
