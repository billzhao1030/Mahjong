#!/bin/bash
# Builds "国标麻将.app" on the Desktop. Clicking it starts the server if it is
# not already running, then opens the game in the default browser.
#
#   bash tools/make-macos-app.sh
#
# The project must NOT live in ~/Desktop, ~/Documents or ~/Downloads: macOS
# treats those as protected folders and a double-clicked app is denied access
# to them, so the server cannot start. ~/mahjong is a good place.
set -e
PROJ="$(cd "$(dirname "$0")/.." && pwd)"
APP="$HOME/Desktop/国标麻将.app"
TMP="$(mktemp -d)"

command -v node >/dev/null || { echo "Node.js is required"; exit 1; }

case "$PROJ" in
  "$HOME/Desktop"/*|"$HOME/Documents"/*|"$HOME/Downloads"/*)
    echo "!! $PROJ is inside a macOS protected folder."
    echo "   Move the project (e.g. to ~/mahjong) and run this again." ;;
esac

echo "building icon ..."
node "$PROJ/tools/make-icon.js" "$TMP/icon.png"
mkdir -p "$TMP/AppIcon.iconset"
gen() { sips -z "$1" "$1" "$TMP/icon.png" --out "$TMP/AppIcon.iconset/$2.png" >/dev/null; }
gen 16 icon_16x16;    gen 32 icon_16x16@2x
gen 32 icon_32x32;    gen 64 icon_32x32@2x
gen 128 icon_128x128; gen 256 icon_128x128@2x
gen 256 icon_256x256; gen 512 icon_256x256@2x
gen 512 icon_512x512; gen 1024 icon_512x512@2x
iconutil -c icns "$TMP/AppIcon.iconset" -o "$TMP/AppIcon.icns"

echo "building bundle ..."
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$TMP/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"
cp "$TMP/icon.png" "$PROJ/public/icon.png"
printf 'APPL????' > "$APP/Contents/PkgInfo"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>国标麻将</string>
  <key>CFBundleDisplayName</key><string>国标麻将</string>
  <key>CFBundleIdentifier</key><string>local.mahjong.mcr</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleExecutable</key><string>launch</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>LSUIElement</key><true/>
  <key>LSMinimumSystemVersion</key><string>10.13</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

cat > "$APP/Contents/MacOS/launch" <<LAUNCH
#!/bin/bash
PROJ="$PROJ"
PORT="\${MJ_PORT:-8030}"
URL="http://127.0.0.1:\$PORT/"
LOG="\$HOME/Library/Logs/GuobiaoMahjong.log"
mkdir -p "\$(dirname "\$LOG")" 2>/dev/null
alert() { /usr/bin/osascript -e "display alert \"国标麻将\" message \"\$1\"" >/dev/null 2>&1; }

if [ ! -f "\$PROJ/server.js" ]; then
  for c in "\$HOME/mahjong" "\$HOME/Desktop/mahjong" "\$HOME/Documents/mahjong" "\$HOME/Downloads/mahjong"; do
    [ -f "\$c/server.js" ] && PROJ="\$c" && break
  done
fi
[ -f "\$PROJ/server.js" ] || { alert "找不到游戏文件夹。"; exit 1; }

running() { /usr/bin/curl -fsS -m 1 "\${URL}api/health" 2>/dev/null | /usr/bin/grep -q '"ok":true'; }
running && { /usr/bin/open "\$URL"; exit 0; }

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node "\$HOME/.volta/bin/node"; do
  [ -x "\$p" ] && NODE="\$p" && break
done
[ -n "\$NODE" ] || NODE="\$(/bin/bash -lc 'command -v node' 2>/dev/null)"
[ -n "\$NODE" ] || { alert "没有找到 Node.js，请先从 nodejs.org 安装（22 或更新版本）。"; exit 1; }

if ! /usr/bin/touch "\$PROJ/data/.probe" 2>/dev/null; then
  alert "无法写入 \$PROJ/data。若项目在桌面/文稿/下载目录，请移到 ~/mahjong。"
  exit 1
fi
/bin/rm -f "\$PROJ/data/.probe" 2>/dev/null

cd "\$PROJ" || exit 1
echo "=== \$(date) starting ===" >> "\$LOG"
PORT="\$PORT" nohup "\$NODE" server.js >> "\$LOG" 2>&1 &
disown 2>/dev/null
for i in \$(seq 1 40); do
  running && { /usr/bin/open "\$URL"; exit 0; }
  sleep 0.25
done
alert "服务器启动失败。日志：\$LOG"
exit 1
LAUNCH

chmod +x "$APP/Contents/MacOS/launch"
codesign --force --sign - --identifier local.mahjong.mcr "$APP" 2>/dev/null || true
touch "$APP"
rm -rf "$TMP"
echo "done -> $APP"
