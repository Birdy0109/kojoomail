#!/usr/bin/env bash
# 打安装包：前端构建 + Rust release + NSIS。产物在 <编译目录>/release/bundle/nsis/
set -e
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"
# 一键登录的客户端 ID（不进 git，见 docs/oauth-setup.md）；没有这个文件就打不带一键登录的包
if [ -f .local/oauth.env ]; then set -a; . ./.local/oauth.env; set +a; echo "一键登录：已读取 .local/oauth.env"; else echo "一键登录：没有 .local/oauth.env，Gmail 用应用专用密码、Outlook 不可用"; fi
# 自动更新的签名私钥（不进 git，丢了已安装的用户就再也收不到更新）；没有就只打安装包
if [ -f .local/updater.key ] && [ -f .local/updater.env ]; then set -a; . ./.local/updater.env; set +a; export TAURI_SIGNING_PRIVATE_KEY="$(cat .local/updater.key)"; echo "更新签名：已读取"; else echo "更新签名：没有 .local/updater.key，不出更新包"; NO_UPDATER='{"bundle":{"createUpdaterArtifacts":false}}'; fi
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
node node_modules/@tauri-apps/cli/tauri.js build ${NO_UPDATER:+--config "$NO_UPDATER"}
T="${CARGO_TARGET_DIR:-$(sed -n 's/^target-dir *= *"\(.*\)"/\1/p' src-tauri/.cargo/config.toml 2>/dev/null)}"
ls -la "${T:-src-tauri/target}/release/bundle/nsis/"
