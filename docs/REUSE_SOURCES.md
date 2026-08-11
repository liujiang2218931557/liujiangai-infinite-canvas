# External Sources Reviewed

## New API

- Source: https://github.com/QuantumNous/new-api
- Purpose: verify the deployed backend's OpenAI-compatible relay routes, user Token ownership model, and CORS behavior before connecting the canvas.
- Source inspected: `v1.0.0-rc.24` source snapshot.
- License: AGPL-3.0.
- Reused code: none. This repository contains no copied New API source files.
- Adaptation: the canvas uses the documented/public relay contract only: a user-created API Key calls `https://liujiangai.cn/v1` with `Authorization: Bearer <key>`.

## Infinite Canvas upstream

- Source: https://github.com/basketikun/infinite-canvas
- Purpose: upstream project for this fork.
- License: MIT, as included in this repository's `LICENSE`.
- Adaptation: this fork adds a fixed six-jiang New API channel, custom model scripts, local-secret export controls, and the reproduction documentation.
