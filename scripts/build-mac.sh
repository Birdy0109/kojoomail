#!/usr/bin/env bash
# 在 Mac 上打包（Apple 芯片）：前端构建 + Rust release + .app，再做 .dmg 和自动更新用的 .app.tar.gz。
# 产物在 ~/kjm-target/release/bundle/。没有苹果开发者账号：用临时签名（tauri.conf.json 的 signingIdentity "-"），
# 别人第一次打开要去「系统设置 → 隐私与安全性」点「仍要打开」。
# 签名用 Mac mini 上自建的固定证书「Kojoo Mail Self-Signed」（~/.kjm-sign，专用钥匙串 kjm-build.keychain-db）：
#   每次签名身份不变，用户在钥匙串里点过「始终允许」，更新后不会再问密码；没有这个证书就退回临时签名 "-"
# 更新包签名的私钥不放在 Mac 上：.app.tar.gz 拿回存私钥的那台机器签名发布。
# 国内网络：Rust 依赖走 rsproxy.cn（~/.cargo/config.toml），npm 走 npmmirror。
set -e
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:/opt/homebrew/bin:$PATH"
export CARGO_TARGET_DIR="$HOME/kjm-target"
if [ -f .local/oauth.env ]; then set -a; . ./.local/oauth.env; set +a; echo "一键登录：已读取 .local/oauth.env"; fi
[ -d node_modules ] || npm ci --registry=https://registry.npmmirror.com
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
if [ -f "$HOME/.kjm-sign/kc.pw" ]; then
  security unlock-keychain -p "$(cat "$HOME/.kjm-sign/kc.pw")" kjm-build.keychain-db
  export APPLE_SIGNING_IDENTITY="$(security find-identity -p codesigning kjm-build.keychain-db | awk '/Kojoo Mail Self-Signed/ {print $2; exit}')"
  echo "签名：固定证书 $APPLE_SIGNING_IDENTITY"
else
  echo "签名：没有固定证书，用临时签名（更新后钥匙串会重新要授权）"
fi
node node_modules/@tauri-apps/cli/tauri.js build --bundles app --config '{"bundle":{"createUpdaterArtifacts":false}}'
VER=$(node -p "require('./src-tauri/tauri.conf.json').version")
B="$CARGO_TARGET_DIR/release/bundle"
APP="$B/macos/Kojoo Mail.app"
# .dmg：拖到「应用程序」安装（tauri 自带的 dmg 要图形界面里的 Finder，SSH 下做不了，用 hdiutil）
rm -rf "$B/dmg-src" && mkdir -p "$B/dmg-src" "$B/dmg"
cp -R "$APP" "$B/dmg-src/" && ln -s /Applications "$B/dmg-src/Applications"
rm -f "$B/dmg/KojooMail_${VER}_aarch64.dmg"
hdiutil create -quiet -volname "Kojoo Mail" -srcfolder "$B/dmg-src" -ov -format UDZO "$B/dmg/KojooMail_${VER}_aarch64.dmg"
# 自动更新包
# 不带 macOS 扩展属性：否则会多出 ._ 开头的文件，更新后签名校验失败、系统说应用已损坏
rm -f "$B/macos/"KojooMail_*_aarch64.app.tar.gz
COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -czf "$B/macos/KojooMail_${VER}_aarch64.app.tar.gz" -C "$B/macos" "Kojoo Mail.app"
codesign -v "$APP" && echo "签名校验通过"
ls -la "$B/dmg" "$B/macos"
