#!/bin/sh
# Installs the IPK on an LG TV registered with ares-setup-device, and launches it.
# Usage: webos/install.sh [device-name]   (default: the device named "lgtv")
set -eu
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/.." && pwd)
device=${1:-lgtv}
command -v ares-install >/dev/null || { echo "ares-install not found: npm install -g @webos-tools/cli" >&2; exit 69; }
ipk=$(ls -t "$root/dist"/org.pnwhome.home_*.ipk 2>/dev/null | head -1) || true
[ -n "$ipk" ] || { echo "Run webos/build.sh first." >&2; exit 66; }
ares-install --device "$device" "$ipk"
ares-launch --device "$device" org.pnwhome.home
