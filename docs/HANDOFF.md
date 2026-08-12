# Handoff: Read This First

## Session Snapshot

- Date: 2026-08-12
- Repository: `liujiang2218931557/liujiangai-infinite-canvas`
- Branch: `main`
- Stable browser adapter baseline: `f62d5b3` (`fix: harden image and video result writeback`).
- Follow-up documentation baseline: `29e1486` (`docs: record result writeback verification`).
- Source type: MIT-licensed Infinite Canvas fork with a fixed New API relay channel. New API itself is not copied into this repository.
- Push status: confirm with `git status -sb` and `git ls-remote origin refs/heads/main` after pulling; GitHub network access was transient during this session, so do not assume a local commit is pushed merely because it exists.

## What This Session Completed

- Fixed the built-in canvas backend at `https://liujiangai.cn/v1`: `web/src/services/api/aicopy.ts`.
- Preserved per-user browser-side New API Token use and locked the built-in endpoint/editor behavior: `web/src/stores/use-config-store.ts`, `web/src/components/layout/channel-editor-drawer.tsx`, and configuration services.
- Added image/video relay scripts and optional reference-media gateway configuration: `web/src/services/api/aicopy.ts`, `web/src/services/api/image.ts`, `web/src/services/api/video.ts`, `cloud-media-gateway/`, `media-gateway/`.
- Hardened result completion and canvas writeback: image URL/Base64 normalization, video nested task/result envelopes, all known pending/success/failure states, authenticated New API content download, media-blob validation, and no duplicate billable Chat-image fallback: `web/src/services/api/aicopy.ts`, `web/src/services/api/video.ts`, `web/src/services/api/model-plugin.ts`.
- Added a non-billable adapter contract suite for three image models and four video models: `web/scripts/verify-aicopy-adapter.mjs`, invoked by `npm.cmd run verify:aicopy` in `web/`.
- Added a focused response/writeback acceptance guide, troubleshooting branches, and refreshed directory map: `docs/RESULT_WRITEBACK.md`, `docs/RUNBOOK.md`, `docs/PROJECT_MAP.md`.
- Added Windows reproducibility instructions and a one-command verifier: `docs/WINDOWS_REPRODUCTION.md`, `.nvmrc`, `scripts/windows-verify.ps1`.
- Repaired reproducible npm installation/build on Windows by removing an Ant Design 5-only wrapper dependency and pinning a valid icon artifact: `web/package.json`, `web/package-lock.json`, `web/src/components/layout/app-providers.tsx`.
- Added handoff, architecture, runbook, state, TODO, changelog, and safe environment examples: root `docs/`, `.env.example`, `cloud-media-gateway/.env.example`.

## Work Not Finished

- P0: SD2.0 cannot submit until the owner changes the upstream product
  entitlement for channel #5. The public model maps correctly to `sd2-720p`,
  but its upstream credential returned HTTP 403 `This token has no access to
  model sd2-720p`. This is not a canvas protocol, polling, or preview-writeback
  defect; do not change the mapping to another model as a workaround.
- P0: New API production polling compatibility is deployed in the separately
  licensed deployment repository. The historical task previously stuck at 30%
  was reconciled as a real upstream `FAILURE`, not a canvas polling failure.
  The remaining P0 is successful-task preview/writeback with an existing
  successful task or explicitly authorized sandbox request.
- P1: User-owned New API Token browser smoke test for `/v1/models`; no actual Token is available to this repository or handoff.
- P1: User-authorized limited paid generation test. Do not create paid requests merely as an engineering check.
- P2: CORS narrowing, SCF abuse controls, and bundle size improvements.

## Architecture and Data Flow

Read `docs/ARCHITECTURE.md`. In short: client browser -> fixed HTTPS New API `/v1` -> New API authorization/billing/routing -> administrator-managed upstream -> client. Optional reference media flows browser -> user-tokenized SCF/COS gateway -> temporary URL -> model request. The canvas contains no account, payment, server cache, administrator credential, or upstream credential.

## Core File Map

| Path | Responsibility |
| --- | --- |
| `web/src/services/api/aicopy.ts` | Fixed New API URL, model metadata, image/video request scripts |
| `web/src/stores/use-config-store.ts` | Channel persistence, built-in channel normalization, secret-field behavior |
| `web/src/components/layout/channel-editor-drawer.tsx` | Built-in channel editor and endpoint locking |
| `web/src/components/layout/app-config-modal.tsx` | User-facing configuration / New API entry point |
| `web/src/components/layout/model-select-modal.tsx` | Fetches models with the user's Token |
| `web/src/services/api/image.ts` | Image/text request entry point |
| `web/src/services/api/video.ts` | Video request entry point and task use |
| `web/scripts/verify-aicopy-adapter.mjs` | Offline contract coverage for all seven bundled New API models; no network or billing |
| `web/src/services/config-file.ts` | Configuration export/import boundary |
| `web/src/services/api/model-plugin.ts` | Public-media upload helper used by scripts |
| `web/src/components/layout/app-providers.tsx` | React/Ant Design providers; now free of Ant Design 5 peer conflict |
| `web/package.json` | Frontend commands and dependencies |
| `web/package-lock.json` | Reproducible npm installation lockfile |
| `scripts/windows-verify.ps1` | Windows install/typecheck/build verifier |
| `cloud-media-gateway/index.mjs` | Tencent SCF + COS reference-media gateway |
| `media-gateway/index.mjs` | local-only Node media gateway |
| `docs/NEW_API_CANVAS_INTEGRATION.md` | API contract and security boundary |
| `docs/WINDOWS_REPRODUCTION.md` | from-zero Windows procedure |
| `docs/RUNBOOK.md` | operational troubleshooting |
| `docs/RESULT_WRITEBACK.md` | model-by-model request, polling, result retrieval, and writeback acceptance rules |
| `docs/PROJECT_MAP.md` | generated repository directory map |
| `docs/TODO.md` | prioritized remaining work |

## Environment and Dependencies

- Primary frontend: Node.js 22 LTS recommended (`.nvmrc`), npm 10+, Git for Windows, modern browser.
- PowerShell may block `npm.ps1`; always invoke `npm.cmd` in docs/scripts.
- Optional Docker Desktop with WSL2 runs the static Nginx image; it does not run New API.
- Development/preview port: 3000. Local media gateway port: 8787. New API uses HTTPS 443.
- External services: `https://liujiangai.cn`, optional Tencent SCF/COS media gateway, administrator-managed upstream providers.

## Configuration

- `.env.example`: optional analytics only; it intentionally contains no model credentials.
- `media-gateway/.env.example`: local developer gateway variables.
- `cloud-media-gateway/.env.example`: SCF environment variable names and fake placeholder values.
- User New API Token: entered into browser settings only; never committed, exported, screenshot, or terminal-logged.
- SCF tokens/COS credentials: configured in Tencent Cloud; never injected into frontend source.

## Verified and Unverified

Verified on Windows:

- clean isolated `npm.cmd ci` using `web/package-lock.json`;
- `npm.cmd run verify:aicopy` using mock-only image/video responses;
- `npm.cmd run typecheck`;
- `npm.cmd run build`;
- Vite development server and HTTP 200 response;
- unauthenticated CORS `OPTIONS` preflight to the New API deployment as recorded in `docs/NEW_API_CANVAS_INTEGRATION.md`.

Not verified:

- browser request with a real ordinary user Token;
- paid image/video generation and accounting;
- a production task that reaches terminal success and returns playable video content to the canvas;
- current SCF deployment, COS object delivery, and provider retrieval with a new upload token;
- Docker deployment from this exact commit.

## Known Issues and Decisions

- Build succeeds with warnings about a large primary JavaScript chunk and two dynamic-import chunking cases. Track this as P2; do not suppress it without a performance decision.
- Npm may report pending install scripts for `esbuild`/`msw`; the verified build succeeded. Review any package-manager policy before changing install-script approvals.
- The dedicated `@ant-design/icons-svg` root pin is intentional: a later registry artifact lacked JavaScript files expected by Ant Design icons and caused Vite resolution failure.
- Keep the New API Base URL fixed. Do not revert to an old IP, old HTTP endpoint, or upstream domain; that would bypass the intended account and billing boundary.
- New API is AGPL-3.0 and remains a separately deployed service. Do not copy its source into this MIT fork without reviewing licensing.
- A task stalled at a fixed progress percentage is a New API async-polling/upstream-adaptor investigation, not grounds to submit duplicate billable jobs. See `docs/RUNBOOK.md` and `docs/RESULT_WRITEBACK.md`.

## Next Session: First Five Steps

1. Read this file, then `docs/CURRENT_STATE.md`, `README.md`, and `docs/RESULT_WRITEBACK.md`.
2. Run `git pull`, inspect `git status -sb`, install dependencies with `npm.cmd ci` in `web/`, and run `npm.cmd run verify:aicopy`, `npm.cmd run typecheck`, and `npm.cmd run build`.
3. Start with P0 in `docs/TODO.md`: validate a successful existing task's New
   API content response and canvas writeback without reintroducing old
   endpoints or issuing duplicate billable jobs.
4. Treat the code and latest commit as authoritative if documentation conflicts, then update the conflicting document in the same change.
5. Keep all real credentials outside Git and do not run paid tests without user authorization.

## Risk and Rollback Points

- Stable browser adapter rollback point: `f62d5b3`; it passed adapter contracts, typecheck, and production build. The subsequent documentation commits do not alter runtime behavior.
- Roll back browser behavior by reverting the integration/follow-up commits, then rebuild static assets. This does not alter New API accounts, balances, channels, or tokens.
- Roll back SCF separately through its deployed function version; do not delete COS content as a code rollback action.
- A compromised Token must be revoked in New API; source control rollback cannot revoke it.

## Instructions for the Next Codex / Engineer

1. First read `docs/HANDOFF.md` -> `docs/CURRENT_STATE.md` -> `README.md`.
2. Then `git pull`, install dependencies, copy only the appropriate example environment file if operating a gateway, and perform the documented smoke test.
3. Begin from the highest-priority open item in `docs/TODO.md`; do not reintroduce explicitly rejected approaches.
4. If documentation conflicts with code, the latest code and commit are authoritative. Fix the document immediately after confirming the code fact.
