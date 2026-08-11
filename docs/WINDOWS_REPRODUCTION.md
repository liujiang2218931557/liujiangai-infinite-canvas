# Windows 从零复现与启动

这份清单适用于拿到本仓库源码的新 Windows 电脑。它不需要服务器登录权限，也不需要任何管理员或上游密钥。

## 需要安装什么

| 软件 | 用途 | 最低建议 |
| --- | --- | --- |
| Git for Windows | 克隆与提交代码 | 当前稳定版 |
| Node.js LTS | 前端运行和构建 | 20.x 或更高 |
| npm | 随 Node 安装 | 10.x 或更高 |
| Docker Desktop（可选） | 用容器运行静态画布 | 当前稳定版，启用 WSL2 后端 |
| 现代浏览器 | 打开画布 | Chrome、Edge 或 Firefox 最新版 |

不需要安装 Go、数据库、Redis、宝塔或 New API 源码来运行画布。它只是静态前端；生产 New API 由 `https://liujiangai.cn` 独立提供。

## 一次性环境检查

打开 PowerShell，执行：

```powershell
git --version
node --version
npm.cmd --version
```

如果 PowerShell 因执行策略拦截 `npm`，使用 `npm.cmd`，例如 `npm.cmd run build`。这不会改变全局执行策略。

仓库将 Node.js 主版本固定为 22（根目录 `.nvmrc`）。Node.js 20+ 可以运行，但新 Windows 电脑优先安装 **Node.js 22 LTS**，以获得与已验证环境一致的依赖解析结果。

## 从零启动

```powershell
git clone https://github.com/<你的 GitHub 用户名>/<你的画布仓库名>.git
cd <你的画布仓库名>\web
npm.cmd ci
npm.cmd run dev
```

### 一键预检

在仓库根目录执行下面的命令可以按锁文件安装依赖，并依次运行类型检查和生产构建：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows-verify.ps1
```

预检不读取 `.env`、不需要 New API 管理员信息，也不会发送模型生成请求。只想在已安装依赖后复检时使用：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows-verify.ps1 -SkipInstall
```

浏览器打开控制台输出的本地地址，通常是 `http://localhost:3000`。开发服务器需保持该终端窗口运行。

首次进入画布：

1. 打开设置 → 渠道。
2. 找到“六酱 New API”，点击“New API”在新标签页注册/登录并自行创建用户 API Key。
3. 返回画布，点击“填写 Key”，粘贴该用户 Key 后保存。
4. 如需用图片/视频/音频作为视频参考，再填写素材网关地址和本次会话上传令牌。

不要把 API Key 或上传令牌贴入终端、GitHub Issue、截图、文档或聊天记录。

## 本地质量检查

```powershell
cd web
npm.cmd run typecheck
npm.cmd run build
```

通过标准：`typecheck` 退出码为 0，`vite build` 输出 `built in ...`。Vite 的大包或动态导入提示是当前项目已有构建警告，不是本次 New API 集成的错误。

## Docker 运行（可选）

在仓库根目录运行：

```powershell
docker compose up --build
```

然后打开 `http://localhost:3000`。Docker 只托管画布静态文件；模型请求仍由浏览器直接发往 `https://liujiangai.cn/v1`，因此 Docker 不会保存 New API 账户或上游凭据。

## 新电脑数据行为

- 画布项目、素材、历史与设置默认在浏览器本地，换电脑不会自动出现。
- WebDAV 是可选同步路径，只有用户主动配置后才同步。
- New API 用户 API Key 会保存在画布所在浏览器的本地配置，但不会被配置导出或导入；新电脑必须由用户重新粘贴。
- 素材上传令牌只保留在当前页面会话，刷新、新电脑和配置导出后都必须重新填写。

## 常见故障

| 现象 | 排查与处理 |
| --- | --- |
| `npm` 无法运行 | 用 `npm.cmd`，不要修改 PowerShell 全局执行策略 |
| `npm ci` 报 Node 版本不支持 | 安装 Node.js 20 LTS 或更新版本后重新打开终端 |
| 地址被占用 | 结束占用 3000 端口的进程，或在 `web/package.json` 的 dev 命令临时指定另一个端口 |
| 模型列表拉取失败 | 检查用户 Key 是否已创建且启用；确认 Base URL 显示为 `https://liujiangai.cn/v1`；在 New API 后台检查该用户的分组和 Token 限制 |
| 浏览器报 CORS | 先对 `https://liujiangai.cn/v1/models` 做 `OPTIONS` 预检；若生产画布域名变更，更新 New API/Nginx 的允许来源后复测 |
| 视频参考素材失败 | 检查素材网关地址、会话令牌和素材是否为可访问 HTTPS URL；不要把 COS 长期密钥填入画布 |
| Key 泄露 | 立即在 New API 后台禁用/删除该用户 Key，再创建一把新的；不要轮换管理员或上游 Key 作为第一反应 |

## 从源码完全丢失时的恢复顺序

1. 从 GitHub 克隆本仓库并依照本文件运行 `npm.cmd ci`、`typecheck`、`build`。
2. 阅读 `docs/NEW_API_CANVAS_INTEGRATION.md`，恢复固定 Base URL、用户 Key 边界和 CORS 要求。
3. 在 `web/src/services/api/aicopy.ts` 恢复预置模型和请求脚本；不要在这里填任何真实密钥。
4. 在 `web/src/stores/use-config-store.ts` 恢复内置渠道固定地址和会话上传令牌剥离逻辑。
5. 在 New API 后台独立恢复用户、充值、模型、分组、价格和上游渠道；这些不属于画布仓库，也不应从画布源码中恢复。
