# 六酱 New API 与无限画布集成说明

这份文档用于从零复建“无限画布作为前端，New API 作为账号、充值、鉴权和模型中转后台”的方案。它只记录公开架构与可复现配置，不含任何真实密钥、密码、Cookie、上游地址或服务器登录资料。

## 一句话架构

画布是静态前端；用户在 New API 自己注册、充值并创建 API Key；画布携带该用户 Key 调用固定的 HTTPS API。余额、模型权限、分组、计费和上游渠道全由 New API 后台裁决。

```text
浏览器中的无限画布
  ├─ 用户自己的 New API Key ──> https://liujiangai.cn/v1
  │                                  ├─ Token 鉴权 / 可用模型
  │                                  ├─ 用户余额 / 配额 / 计费
  │                                  ├─ 分组 / 模型限制
  │                                  └─ 管理员配置的上游渠道
  └─ 可选的素材上传令牌 ───────> 用户自己的素材网关 / COS
                                     └─ 生成需要公网素材时返回临时 HTTPS URL
```

## 固定约束

| 项目 | 规定 |
| --- | --- |
| 画布模型 Base URL | 固定为 `https://liujiangai.cn/v1` |
| New API 用户入口 | `https://liujiangai.cn` |
| 用户身份与充值 | 只在 New API 中处理 |
| 画布 API Key | 用户在 New API 后台自行创建后粘贴；只在该浏览器本地保存，不随配置导出 |
| 素材上传令牌 | 仅当前浏览器会话；不持久化、不导出 |
| 禁止进入前端或 Git 的内容 | 管理员 Key、上游 Key、服务器密码、数据库密码、COS 密钥、Cookie、真实用户 Key |
| 禁止作为活跃配置的旧地址 | 任何 IP HTTP 地址及历史上游域名 |

`web/src/services/api/aicopy.ts` 的 `AICOPY_BASE_URL` 是唯一的内置画布模型地址。`web/src/stores/use-config-store.ts` 会在启动时强制把内置渠道归一为此地址；`web/src/components/layout/channel-editor-drawer.tsx` 会锁定该渠道的 Base URL 与 OpenAI 协议，避免用户把内置渠道改回其他后端。

## 用户使用流程

1. 打开 `https://liujiangai.cn`，注册或登录自己的 New API 账号。
2. 通过 New API 的充值页面为该账号充值。
3. 在 New API 的 Token/API Key 管理页面自行创建一把普通 API Key。建议名称为“无限画布”，设置小额额度、有效期和可选 IP 白名单。
4. 打开画布的“设置 → 渠道”，找到“六酱 New API”，点击“填写 Key”，粘贴该用户自己的 Key 后保存。
5. 画布通过 `GET /v1/models` 读取这把 Key 实际可用的模型；后续图片、视频和文本请求仍由 New API 在服务端鉴权、计费和路由。
6. 如需视频的图片、视频或音频参考素材，填写自己的素材网关地址与临时上传令牌。刷新页面后需重新填写上传令牌。

画布不读取或保存 New API 网站密码，不代用户注册，不代用户充值，也不创建或管理管理员侧的上游渠道。

## 请求与责任边界

| 请求 | 发起方 | 鉴权 | 最终责任方 |
| --- | --- | --- | --- |
| `GET /v1/models` | 画布 | 用户 API Key | New API：按用户、Token、分组过滤 |
| `POST /v1/images/generations` / `edits` | 画布脚本 | 用户 API Key | New API：计费、模型限制、上游路由 |
| `POST /v1/videos` / 查询任务 | 画布脚本 | 用户 API Key | New API：计费、模型限制、上游路由 |
| 素材上传 | 画布 | 用户自己的网关令牌 | 素材网关/COS；New API 不持有其令牌 |
| 充值、用户管理、渠道管理 | New API 网站 | 用户或管理员网页登录 | New API |

## 官方 New API 源码对照

本项目没有复制 New API 源码。实现前对照了官方仓库 [QuantumNous/new-api](https://github.com/QuantumNous/new-api)，本地核对版本为 `v1.0.0-rc.24` 对应的源码快照。

| 官方代码位置 | 已核对行为 | 本项目如何使用 |
| --- | --- | --- |
| `router/relay-router.go` | `/v1/models` 及 `/v1/*` 经 `TokenAuth()` 保护 | 画布用 `Authorization: Bearer <用户 Key>` 调用固定 `/v1` 地址 |
| `controller/token.go` | 用户可在 `/api/token/` 创建、查看、撤销自己的 Token；明文 Key 通过受保护接口取回 | 画布不调用这些管理接口；用户在 New API 后台自行管理 Key |
| `router/api-router.go` | `/api/token/*` 位于 `UserAuth()` 后 | 管理行为留在 New API 站点，避免画布收集网站登录凭据 |
| `middleware/cors.go` | CORS 支持 `GET, POST, PUT, DELETE, OPTIONS` 和 `Authorization` 请求头 | 已对部署地址做无凭据 `OPTIONS` 预检，`/v1/models` 返回 `204` |

官方 New API 使用 AGPL-3.0；它作为独立部署的服务运行。本画布源自 MIT 项目。不要将 New API 源码复制进本仓库，除非先处理许可证兼容性与开源义务。

## 预置模型与脚本

`web/src/services/api/aicopy.ts` 保存了本次对齐的展示名、模型标识和图片/视频请求脚本。脚本会把用户在画布内的设置转换为 New API 转发的 OpenAI 兼容请求：

- 图片：`/v1/chat/completions`、`/v1/images/generations`、`/v1/images/edits`。
- 视频：`/v1/videos`，部分多参考路由使用 `/v1/video/generations`；随后轮询任务并在需要时读取 `/content`。
- 生成需公网素材时，脚本先调用用户填写的素材网关，取得可访问的 HTTPS URL 再把 URL 传给 New API。

当前公开模型契约和画布回写规则见 `docs/RESULT_WRITEBACK.md`。它区分“前端已完成离线协议验证”与“生产 New API 已成功完成一次真实任务”；不要把两者混为一谈。

模型展示名不等于上游模型名。脚本里的 `model` 字段才是发送给 New API 的实际模型名。新增或改价模型时，应先在 New API 后台完成模型/渠道/价格配置，再以低风险的 `GET /v1/models` 验证该用户 Token 是否可见；不要为了验证而发送付费生成请求。

### Seedance 2.5 稳定渠道

画布预置模型 `seedance-2.5-stable` 显示为 **Seedance 2.5 Stable
Channel**。它固定请求 New API，而不直接请求聚客上游：New API 再映射到
上游 `seedance-2-5-promo`。画布允许的参数与上游合同对齐：

| Parameter | Values |
| --- | --- |
| Duration | `4, 5, 6, 8, 10, 12, 15, 20, 25, 29, 30` seconds |
| Resolution | `480p`, `720p` |
| Ratio | `16:9`, `9:16`, `21:9`, `3:4`, `1:1`, `4:3` |
| Reference media | up to 30 images, 10 videos, and 10 audio files |

The canvas turns local reference media into public HTTPS URLs through the
user-configured media gateway before submitting the task. It rejects unsupported
duration values locally, while New API repeats the validation and uses the
requested duration as the billing multiplier. The intended operator price is
CNY 1.00 per second, configured only in New API administration.

The model will not work for users until the pending New API JuKe adapter is
deployed, the channel has an owner key, its mapping is configured, and the
appropriate group abilities and price are enabled. Those production steps are
recorded in the relay repository's `docs/JUKE_SEEDANCE_2_5_STABLE.md`.

## CORS 验证与生产建议

已用本地开发来源 `http://localhost:3000` 对以下地址做无 Key 的预检：

```text
OPTIONS https://liujiangai.cn/v1/models
OPTIONS https://liujiangai.cn/api/user/login
```

两者均返回 `204`，包含 `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS` 与允许的请求头。因此浏览器可携带 `Authorization` 调用 `/v1`。没有发送任何带 Key 的请求和任何付费生成请求。

当前服务器 CORS 响应允许任意来源。因为画布使用 Bearer Key 且不依赖跨站 Cookie，这在功能上可用；正式对外时更建议在 New API/Nginx 层将允许来源收敛为实际画布域名及开发地址，删除不需要的 `Allow-Credentials` 组合，并重新执行预检和真机冒烟。

## 文件地图

| 路径 | 职责 |
| --- | --- |
| `web/src/services/api/aicopy.ts` | 固定 New API Base URL、预置模型、图片/视频脚本和素材网关默认地址 |
| `web/src/stores/use-config-store.ts` | 渠道配置、浏览器持久化、内置地址强制归一、会话密钥剥离 |
| `web/src/components/layout/app-config-modal.tsx` | 设置中的“填写 Key”、New API 跳转、本机断开操作 |
| `web/src/components/layout/channel-editor-drawer.tsx` | 内置渠道编辑页、固定 Base URL、Key 和素材网关输入 |
| `web/src/components/layout/model-select-modal.tsx` | 使用该用户 API Key 拉取 `/v1/models` 的模型选择界面 |
| `web/src/services/api/image.ts` | 图片与文本 API 请求入口 |
| `web/src/services/api/video.ts` | 视频 API 请求入口 |
| `web/src/services/config-file.ts` | 配置导入导出，导出时剥离会话素材令牌 |
| `docs/WINDOWS_REPRODUCTION.md` | Windows 从零安装、启动、构建、排障 |
| `docs/REUSE_SOURCES.md` | 上游与 New API 源码对照、许可证和未复制源码声明 |

## 验收清单

- [x] 内置渠道 Base URL 只使用 `https://liujiangai.cn/v1`。
- [x] 内置渠道编辑器禁止改写该 Base URL。
- [x] New API 用户 Key 由用户自行创建并填入画布。
- [x] 管理员、上游和素材网关的秘密不在源码或文档中。
- [x] 素材网关令牌不会持久化或导出；用户 API Key 与 WebDAV 密码不会导出或导入。
- [x] TypeScript 检查通过，生产构建通过。
- [x] Windows 的 `npm.cmd ci` 已用锁文件复现；项目不依赖 PowerShell 放开 `npm.ps1` 执行策略。
- [x] 无 Key 的 CORS 预检通过。
- [ ] 用真实普通用户 Key 在浏览器中验证 `/v1/models`。不得在本仓库、终端输出或截图中记录该 Key。
- [ ] 由用户决定并执行一次受控付费模型调用验收；本次未执行任何付费请求。

## 回滚

若新集成需要紧急撤回，回滚包含“六酱 New API”提交的版本即可。回滚只影响画布默认地址和浏览器配置逻辑，不会删除 New API 的用户、Token、余额、渠道或上游配置。用户已经保存的浏览器 Key 不会由 Git 回滚自动删除；可在画布点击“断开”清除本机 Key，或在 New API 后台撤销该 Key。
