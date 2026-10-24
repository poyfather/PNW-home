#!/bin/sh
# Packages PNW Home for LG webOS: dist/org.pnwhome.home_<version>_all.ipk
# Needs the webOS CLI: npm install -g @webos-tools/cli
set -eu
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/.." && pwd)
command -v ares-package >/dev/null || { echo "ares-package not found: npm install -g @webos-tools/cli" >&2; exit 69; }

stage="$here/build/app"
rm -rf "$here/build"
mkdir -p "$stage"
# The shared web core, minus the Tizen manifest and build leftovers.
(cd "$root/app" && tar --exclude=config.xml --exclude=.buildResult --exclude='*.wgt' -cf - .) | (cd "$stage" && tar -xf -)
cp "$here/appinfo.json" "$stage/"
cp "$here/icon.png" "$here/largeIcon.png" "$stage/"

mkdir -p "$root/dist"
ares-package --no-minify -o "$root/dist" "$stage" >/dev/null
ipk=$(ls -t "$root/dist"/org.pnwhome.home_*.ipk | head -1)
echo "Built ${ipk#$root/}"
