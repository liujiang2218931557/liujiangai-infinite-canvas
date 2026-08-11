# Current State

Last reviewed: 2026-08-12.

## Completed

- [x] The bundled `六酱 New API` channel uses only `https://liujiangai.cn/v1`.
- [x] The bundled channel pins its base URL and OpenAI-compatible format in the editor.
- [x] Each canvas user supplies their own New API Token; no administrator or upstream key is present in source, exported configuration, or documentation.
- [x] User API keys, WebDAV passwords, and media upload tokens are removed from exported/imported configuration where applicable; upload tokens are session-only.
- [x] Image and video scripts support the configured New API relay routes and public-media upload path.
- [x] Windows support is documented; `.nvmrc` pins Node 22 and `scripts/windows-verify.ps1` uses `npm.cmd` for PowerShell execution-policy compatibility.
- [x] A clean Windows-style `npm.cmd ci`, `npm.cmd run typecheck`, and `npm.cmd run build` succeeded during this handoff.
- [x] Local Vite smoke test returned HTTP 200 from `http://localhost:3000`.

## In Progress

- [x] P0: Published reviewed source tree to `origin/main` at commit `eb83077`.
- [ ] P1: End-to-end browser validation with a newly created ordinary New API user token. Blocker: the token must be entered by its owner and must not be recorded in Git, terminal output, or screenshots.
- [ ] P1: Controlled paid image/video generation validation. Blocker: user authorization and a deliberately limited test balance.

## Not Started

- [ ] P2: Restrict New API CORS from its current permissive policy to the production canvas domain(s) plus required local development origins.
- [ ] P2: Replace the media-gateway user-token JSON list with durable user management, rate limiting, monitoring, and revocation UI before public-scale distribution.
- [ ] P2: Reduce the Vite production bundle; current build succeeds but produces a large main JavaScript chunk warning.

## Live Configuration Facts

| Area | Current default / rule |
| --- | --- |
| Model backend | `https://liujiangai.cn/v1` only; never the old HTTP IP or legacy upstream domain |
| Authentication | Browser sends the individual user's New API Bearer Token directly to `/v1` |
| Account, balance, pricing, model permissions | Controlled by New API; the canvas has no billing backend |
| Image routes | `/v1/chat/completions`, `/v1/images/generations`, `/v1/images/edits` |
| Video routes | `/v1/videos`, selected multi-reference scripts use `/v1/video/generations`, then polling/content retrieval |
| Public reference media | Optional Tencent Cloud Function + private COS gateway, returning temporary HTTPS URLs |
| Canvas persistence | Browser local storage / IndexedDB; optional user-configured WebDAV |
| Server cache | None in the static canvas; browser and upstream behavior are outside this repository |
