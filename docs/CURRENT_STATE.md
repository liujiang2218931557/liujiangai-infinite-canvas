# Current State

Last reviewed: 2026-08-14.

## Completed

- [x] The bundled `六酱 New API` channel uses only `https://liujiangai.cn/v1`.
- [x] The bundled channel pins its base URL and OpenAI-compatible format in the editor.
- [x] Each canvas user supplies their own New API Token; no administrator or upstream key is present in source, exported configuration, or documentation.
- [x] User API keys, WebDAV passwords, and media upload tokens are removed from exported/imported configuration where applicable; upload tokens are session-only.
- [x] Image and video scripts support the configured New API relay routes and public-media upload path.
- [x] Windows support is documented; `.nvmrc` pins Node 22 and `scripts/windows-verify.ps1` uses `npm.cmd` for PowerShell execution-policy compatibility.
- [x] A clean Windows-style `npm.cmd ci`, `npm.cmd run typecheck`, and `npm.cmd run build` succeeded during this handoff.
- [x] Local Vite smoke test returned HTTP 200 from `http://localhost:3000`.
- [x] The Seedance 2.5 canvas adapter accepts task-result URLs from the common top-level, `data`, and `result` response envelopes, and uses `/content?variant=video` before the legacy content fallback.
- [x] The canvas rejects a final Seedance 2.5 prompt longer than 5,000 characters locally, before a billable task request is sent.
- [x] The built-in canvas inventory now exactly matches the seven models
  returned by the public New API pricing endpoint: three image models and four
  video models. The two per-request video models are forced to 15 seconds.
- [x] The model-script polling helper awaits asynchronous result extractors.
  This prevents an in-progress New API video task from being mistaken for an
  empty final result while the script fetches protected video content.
- [x] The built-in image adapter accepts the live public image model contracts:
  Chat/SSE URL output for `firefly-gpt-image-*`, and URL or Base64 image output
  for `gpt-image-2` and `Adobe-gpt-image-2`.
- [x] The built-in video adapter recognizes common nested task IDs/result URLs,
  five success states, eleven terminal failure states, and protected New API
  content downloads. It saves an authenticated Blob before canvas preview
  writeback instead of returning an unplayable protected URL.
- [x] The offline `npm.cmd run verify:aicopy` contract suite covers all seven
  public models, image reference routes, video pending/success/failure states,
  protected content downloads, and Blob handoff. It never contacts New API.

## In Progress

- [x] P0: Published reviewed source tree to `origin/main` at commit `eb83077`.
- [ ] P1: End-to-end browser validation with a newly created ordinary New API user token. Blocker: the token must be entered by its owner and must not be recorded in Git, terminal output, or screenshots.
- [ ] P1: Controlled paid image/video generation validation. Blocker: user authorization and a deliberately limited test balance.
- [x] P0: New API production task polling no longer leaves the historical
  task at fake `in progress`/30%. On 2026-08-12 the deployment repository
  added a narrow external-upstream compatibility fallback: the upstream content
  endpoint reported that task as `FAILURE`, and New API recorded the truthful
  `FAILURE`/100% state. No duplicate paid request was made.
- [ ] P0: Observe an existing successful task through the production New API
  terminal state and canvas preview/writeback. Blocker: the audited historical
  task was truly failed, so it cannot validate success media. Do not submit a
  duplicate paid request merely to check it.
- [ ] P0: Restore the SD2.0 product entitlement on the owner-managed upstream
  key used by New API channel #5. The canvas protocol, New API public model,
  and public-to-upstream mapping were audited on 2026-08-12. The upstream
  returned HTTP 403 `This token has no access to model sd2-720p`; no task was
  created, so polling and preview writeback are not implicated. Do not remap
  the public SD2.0 product to another upstream model as a workaround.
- [ ] P0: Reconcile upstream availability for SD2.5. The canvas user's token
  reached New API channel #1, whose request has no mapping or parameter
  overrides, but upstream returned HTTP 503 `当前请求的模型暂不可用，请更换模型后重试。`.
  Read-only model discovery also reports one configured SD2.5 model as removed
  upstream. This is provider inventory/availability work, not a canvas request
  or preview-writeback defect.
- [ ] P0: New API Hong Kong VPS health must be reconciled before deploying the
  pending JuKe adapter. Rainyun NoVNC showed `dockerd`, `postgres`, journald,
  and worker tasks blocked for more than 120 seconds on 2026-08-13.

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
| Result writeback | Canvas stores successful image results as image-node metadata and successful video results as video-node metadata after URL/blob retrieval; this code path is built and contract-tested but has not been validated against a successful live New API task |
| Video state diagnosis | The historical task that was at `in progress`/30% was checked against the upstream authenticated content route by the fixed New API poller and correctly became `FAILURE`/100%. The canvas now awaits an existing successful task to validate live media preview/writeback; no paid retry was made. |
| SD2.0 403 diagnosis | Channel #5 maps `sd-720满血-不卡脸（按次）` to `sd2-720p`, and the canvas sends the documented `/v1/videos` request. The upstream Key lacks entitlement to `sd2-720p`. Update that upstream product/key permission before another test. |
| SD2.5 503 diagnosis | The user token and channel #1 route work. Channel #1 passes its public SD2.5 name without a mapping or override; upstream rejected the 720p submission as temporarily unavailable and reports one configured SD2.5 model removed from its live inventory. |
| New API host health | Deployment repository records a 2026-08-13 NoVNC stall; do not treat it as a canvas protocol failure or deploy while it persists. |
