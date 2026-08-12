# Architecture

## Request Flow

```text
User browser
  │
  ├─ Canvas UI and local project data (IndexedDB / local storage)
  │
  ├─ Authorization: Bearer <the user's New API Token>
  ▼
https://liujiangai.cn/v1
  ├─ New API token authorization
  ├─ user balance, quota, group, and visible-model checks
  ├─ model price/accounting and administrator-managed route selection
  ▼
Administrator-managed upstream provider
  ▼
Result / task status / content back to the browser

Optional media-reference path
Browser ── user upload token ──> Tencent SCF media gateway ──> private COS
Browser <── temporary HTTPS URL ───────────────────────────────┘
Browser ── reference URL in model request ──> New API `/v1` relay
```

## Image and Video Completion Rules

- The three exposed image models are synchronous. The canvas accepts returned
  `data[].url` (including a New API-relative URL) or `data[].b64_json`, saves
  the image to browser storage, and writes image metadata back to the source
  canvas node.
- Video generation is asynchronous. The canvas stores a loading video node,
  then polls the same authenticated New API route every five seconds.
- Pending statuses are `queued`, `pending`, `processing`, `in_progress`, and
  `running`. Successful statuses are `completed`, `succeeded`, `success`,
  `done`, and `finished`. Failure statuses include `failed`, `failure`,
  `error`, `cancelled`, `canceled`, `expired`, `rejected`, `blocked`,
  `aborted`, `timeout`, and `timed_out`.
- A success response may contain a direct result URL. When it exposes a
  protected New API `/v1/videos/{task_id}/content` URL or no URL at all, the
  canvas downloads the content with the current user's Bearer Token, validates
  that it is media rather than an HTML/JSON error, stores it locally, and then
  writes the playable video metadata to the canvas. A protected content
  download failure is intentionally shown as an error, not as a false-success
  unplayable preview.

## Boundaries

- The canvas does not implement accounts, payment, credits, price calculations, upstream routing, or persistent server-side caching.
- New API is the sole owner of user accounts, Token lifecycle, balance, model visibility, group policy, and upstream credentials.
- The browser stores only its own local canvas state and user-entered Token. Exported configuration removes secret fields.
- The optional media gateway does not route model calls. It only supplies temporary HTTPS references for providers that cannot read browser-local blobs.

## Ports and Runtime

| Service | Default port | Runtime |
| --- | --- | --- |
| Vite development server | 3000 | Node.js 22 LTS recommended |
| Vite preview / Docker Nginx | 3000 | Node.js preview / Nginx container |
| Local media gateway | 8787 | Node.js, optional local-only development path |
| New API | HTTPS 443 | independently deployed at `liujiangai.cn` |

## Important Constraints

- The browser calls HTTPS New API directly. A public HTTPS canvas must not send model calls to a plain HTTP backend.
- Token sharing is a business and abuse-control concern, not a reason to embed an administrator key in the browser.
- Browser storage is device/browser-local until the user deliberately exports data or configures WebDAV.
