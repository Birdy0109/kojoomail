# Kojoo Mail

所有邮箱，一个收件箱。多账号统一收发 + AI 批注、待办、起草回复，邮件只存在你自己的电脑上。

Windows 10/11 · macOS（Apple 芯片）· 下载：https://mail.songxxai.com/kojoomail/

## 能做什么

- **账号**：QQ / 网易 / 126（授权码）、Gmail、Outlook（一键登录，或 Gmail 应用专用密码）、iCloud、kojoo.co、其他 IMAP 邮箱
- **统一收件箱**：所有账号按时间排在一起，回复时自动用对的身份；智能视图有重点、待办、稍后处理、草稿、已发送
- **AI**（任何 OpenAI 兼容接口，填你自己的密钥）：摘要、分类、标重点、提取要点和待办、建议回复、改写/翻译。AI 只起草，不替你发信；可以按账号关掉 AI
- **写信**支持 Markdown，点发送后几秒内可撤销
- **网络**：跟随系统代理连邮件服务器（国内用 Gmail 不用开全局）
- **省资源**：每个账号一条连接，有推送就不轮询，空闲时几乎不占 CPU，常驻内存约 100MB

## 隐私

- 邮件、设置、待办存在本机；密码、登录授权、AI 密钥存在系统的凭据管理器（Windows 凭据管理器 / macOS 钥匙串）
- 程序只连接：你的邮件服务器、一键登录时的谷歌/微软登录服务、你自己配置的 AI 接口、检查更新的地址。没有统计、没有广告
- 详见 [隐私政策](https://mail.songxxai.com/kojoomail/privacy)

## 从源码编译

需要 Node.js 20+、Rust（stable）和 [Tauri 2 的系统依赖](https://v2.tauri.app/start/prerequisites/)。

```bash
npm ci
npm run tauri dev                  # 开发模式
bash scripts/build-installer.sh    # Windows 安装包
bash scripts/build-mac.sh          # macOS（在 Mac 上跑）
```

- Gmail / Outlook 一键登录需要你自己申请客户端 ID，见 [docs/oauth-setup.md](docs/oauth-setup.md)；不申请也能编译，Gmail 用应用专用密码登录
- **自己改代码再分发的话**：把 `src-tauri/tauri.conf.json` 里 `plugins.updater` 的 `pubkey` 和 `endpoints` 换成你自己的（`tauri signer generate` 生成密钥），或者删掉这一段。否则你的版本会提示用户更新到官方版

目录：`src/` 界面（React + TypeScript）· `src-tauri/` 后端（Rust）· `design/` 图标源文件 · `docs/` 说明 · `tests/` 测试 · `scripts/` 构建脚本

## 参与

欢迎提 Issue 和 Pull Request，提交前请看 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[GNU AGPL-3.0](LICENSE)。你可以免费使用、修改和分发；分发修改后的版本（包括做成网络服务给别人用）时，也必须按 AGPL 公开源码。需要闭源使用或商业授权，请联系 eko@kojoo.co。

---

## English

Kojoo Mail is a desktop email client (Windows / macOS) that puts all your mailboxes in one inbox, with optional AI summaries, to-dos and reply drafts using your own OpenAI-compatible API key. Mail stays on your computer; credentials live in the OS credential store.

Build from source with Node.js 20+ and Rust: `npm ci && npm run tauri dev`. If you redistribute a modified build, replace the updater `pubkey` / `endpoints` in `src-tauri/tauri.conf.json`.

Licensed under [AGPL-3.0](LICENSE). For commercial licensing, contact eko@kojoo.co.
