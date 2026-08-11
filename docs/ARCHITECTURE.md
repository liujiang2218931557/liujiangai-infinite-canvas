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
