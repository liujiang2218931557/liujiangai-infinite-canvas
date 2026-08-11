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
