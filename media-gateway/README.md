# COS Private Media Gateway

This local service uploads canvas references to a private Tencent COS bucket and returns a temporary signed HTTPS URL. It only listens on `127.0.0.1`; the AI provider reads the signed COS URL directly, not this local service.

## 1. Create a restricted CAM access key

In Tencent Cloud CAM, create a programmatic-access sub-account. Grant it only `name/cos:PutObject` and `name/cos:GetObject` for the bucket prefix `infinite-canvas/*` in your bucket (region `ap-guangzhou`). Do not use the root account's access key.

## 2. Configure and run locally

Copy `.env.example` to `.env`. Replace `COS_SECRET_ID` and `COS_SECRET_KEY`. Optionally set a long random `MEDIA_GATEWAY_TOKEN`.

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Keep this terminal open while using models that require public media. It is not a public web server.

## 3. Configure the canvas

In the AICopy channel settings, set **公网素材上传地址** to `http://127.0.0.1:8787/upload`. If a `MEDIA_GATEWAY_TOKEN` was set, paste that same value into **上传令牌**. Do not enter COS keys in the canvas.

## 4. Automatically delete temporary media

In the COS bucket, configure a lifecycle rule for prefix `infinite-canvas/` that deletes current objects after 3 days. Keep bucket access as **私有读写**. The gateway produces 24-hour signed links by default; changing `SIGNED_URL_TTL_SECONDS` changes that window, up to 7 days.
