# TODO

## P0

- [x] Reconcile the historical video task failure in New API production.
  - Files: New API production image/relay patch outside this repository;
    `web/src/services/api/aicopy.ts` and `web/src/services/api/video.ts` are
    the client-side request/poll reference.
  - Evidence: production New API's upstream polling fallback used the existing
    task's authenticated content endpoint and recorded its real terminal
    `FAILURE`/100% state. No new paid video request was made.

- [ ] Observe an existing successful task using the repaired canvas poller.
  - Files: `web/src/services/api/model-plugin.ts` and
    `web/src/services/api/aicopy.ts`; New API production async task worker and
    video task adaptor are outside this repository.
  - Dependency: a task already known successful must be available to the user;
    do not submit a duplicate paid task just for verification.
  - Acceptance: New API transitions to a terminal state. On success the
    script downloads authenticated video content and writes it to a previewable
    video node; on failure it surfaces New API's failure message rather than
    the misleading `scriptNoVideo` error.

## P1

- [ ] Verify a normal user's New API Token can list models in the browser.
  - Files: no source change expected; use `web/src/components/layout/model-select-modal.tsx` and `web/src/services/api/aicopy.ts` only as reference.
  - Dependency: user creates a restricted ordinary Token in New API.
  - Acceptance: the canvas retrieves only models visible to that Token; no credential enters Git, shell history, screenshot, or chat.

- [ ] Run one user-approved paid generation test for every exposed image/video model family.
  - Files: `web/src/services/api/aicopy.ts`, New API channel configuration outside this repository.
  - Dependency: a small capped user balance, upstream readiness, and public reference-media gateway for media inputs.
  - Acceptance: a completed result and correct balance deduction are visible in the user's New API account; image/video records appear in the applicable New API log; task polling returns a usable URL or authenticated content blob; the canvas writes the result back to the originating node.

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
