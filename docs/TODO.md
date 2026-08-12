# TODO

## P0

- [ ] Reconcile and repair the existing video task failures before treating video writeback as live.
  - Files: New API production image/relay patch outside this repository;
    `web/src/services/api/aicopy.ts` and `web/src/services/api/video.ts` are
    the client-side request/poll reference.
  - Evidence: on 2026-08-12, New API listed four failed canvas video tasks with
    `upstream returned error`; upstream success and New API task IDs were not
    correlated. New API had no image records in drawing or general logs.
  - Dependency: correlate one existing upstream task with its New API public
    task ID, or explicitly authorize a capped test balance for one new task.
  - Acceptance: New API task transitions to SUCCESS, the authenticated content
    route returns a playable MP4, and the canvas video node reaches SUCCESS
    with previewable metadata.

- [ ] Observe the current in-progress task using the repaired canvas poller.
  - Files: `web/src/services/api/model-plugin.ts` and
    `web/src/services/api/aicopy.ts`.
  - Dependency: the task already submitted by the user must reach a terminal
    New API status; do not submit a duplicate request.
  - Acceptance: on success the script waits for authenticated video content and
    writes it back to a video node; on failure it surfaces the New API failure
    message rather than the misleading `scriptNoVideo` error.

## P1

- [ ] Verify a normal user's New API Token can list models in the browser.
  - Files: no source change expected; use `web/src/components/layout/model-select-modal.tsx` and `web/src/services/api/aicopy.ts` only as reference.
  - Dependency: user creates a restricted ordinary Token in New API.
  - Acceptance: the canvas retrieves only models visible to that Token; no credential enters Git, shell history, screenshot, or chat.

- [ ] Run one user-approved paid generation test for every exposed image/video model family.
  - Files: `web/src/services/api/aicopy.ts`, New API channel configuration outside this repository.
  - Dependency: a small capped user balance, upstream readiness, and public reference-media gateway for media inputs.
  - Acceptance: a completed result and correct balance deduction are visible in the user's New API account; image/video records appear in the applicable New API log; task polling returns a usable URL or content blob; the canvas writes the result back to the originating node.

## P2

- [ ] Harden CORS and production domains.
  - Files: New API/Nginx deployment configuration outside this repository; update `docs/NEW_API_CANVAS_INTEGRATION.md` after change.
  - Dependency: the final canvas public domain(s).
  - Acceptance: expected production and local origins pass preflight, arbitrary origins fail, and Bearer `/v1` calls still work.

- [ ] Add production controls to the Tencent Cloud media gateway.
  - Files: `cloud-media-gateway/index.mjs`, its deployment configuration, and `cloud-media-gateway/README.md`.
  - Dependency: decision on a user database and operations ownership.
  - Acceptance: individually revocable tokens, rate limits, audit logs, alerts, and no long-lived root credentials.

- [ ] Split or lazy-load the large web bundle.
  - Files: `web/vite.config.ts` and the relevant routes/components.
  - Dependency: performance budget.
  - Acceptance: production build succeeds and its primary initial JavaScript payload is materially reduced without breaking canvas plugins.
