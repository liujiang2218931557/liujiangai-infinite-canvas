# Tencent Cloud COS Media Gateway

This is the production gateway for distributing Infinite Canvas to other people. It runs in Tencent Cloud SCF, uploads to your private COS bucket, and returns a temporary signed HTTPS URL to the video model. It does not depend on your computer being online.

The Function URL contract sends the request body as text, which corrupts direct multipart image and video uploads. This gateway deliberately uses JSON Base64 chunks instead: the client sends 3 MiB chunks, SCF validates each authenticated session, and COS receives the file through its multipart APIs. Do not replace this protocol with a raw `multipart/form-data` request.

Every user receives a different upload token. The gateway applies a per-user daily upload quota and stores each user's objects under a separate prefix. The signed URL is valid for 24 hours by default; the COS bucket stays private.

## Deploy

1. Open Tencent Cloud SCF, create a Node.js 20 function, upload this folder after running `npm install`, and set the handler to `index.main_handler`.
2. Enable a Function URL, route `POST /upload`, and enable CORS. Copy the resulting HTTPS invoke URL, including `/upload`.
3. Use the SCF service role for COS access. Add the COS prefix policy to `SCF_QcsRole`; do not store a COS access key in the function. Then add these SCF environment variables.

```text
COS_BUCKET=example-1234567890
COS_REGION=ap-guangzhou
SIGNED_URL_TTL_SECONDS=86400
MAX_UPLOAD_BYTES=104857600
DEFAULT_DAILY_BYTES=5368709120
MEDIA_GATEWAY_USERS_JSON=[{"id":"demo-user","token":"replace-with-a-random-token","dailyBytes":5368709120}]
```

The SCF service role or dedicated CAM user needs only `PutObject`, `GetObject`, `HeadObject`, `GetBucket`, `InitiateMultipartUpload`, `UploadPart`, `CompleteMultipartUpload`, `AbortMultipartUpload`, and `DeleteObject` for the `infinite-canvas/*` prefix of this COS bucket. Do not use a root-account access key. `COS_SECRET_ID` and `COS_SECRET_KEY` are optional local-development fallbacks only.

The deployed function currently uses the dedicated CAM user credentials that are already stored as SCF environment variables. They are intentionally preferred over the service role because this gateway has a prefix-restricted CAM policy.

## Issue a User Token

Run this locally:

```powershell
node create-user-token.mjs customer-001
```

Append the printed object to `MEDIA_GATEWAY_USERS_JSON` in the SCF environment variables, deploy the environment update, and privately give that user's `token` to them. The user enters it in Infinite Canvas under My proxy image / video channel settings -> Upload token. All users use the same SCF upload URL. The canvas ships with the gateway URL prefilled but never ships a token.

For the checked-in web application, use the My proxy image / video channel's prefilled media upload URL. Add only the private token in the channel editor. Do not put a token in `aicopy.ts`, an environment file committed to Git, or a distributable build.

## COS Lifecycle

In COS, create a lifecycle rule for prefix `infinite-canvas/` that deletes current objects after 3 days. Keep the bucket permission as private read/write. That limits storage cost while leaving ample time for generation tasks to fetch the signed URL.

Exclude `infinite-canvas/deploy/` from that rule if you want the SCF deployment ZIP retained for later rollback; apply the 3-day rule to `infinite-canvas/references/`.

## Limits

This is a deliberately simple first production control plane: a distinct per-user token plus a daily byte quota. The deployment defaults to 5 GiB per user per UTC day. It prevents a single leaked token from consuming unlimited storage, but token sharing is still possible. Before public-scale distribution, replace this list with a user database and add registration, billing, rate limits, and abuse monitoring.
