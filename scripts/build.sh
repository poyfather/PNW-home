#!/bin/sh
# Builds and signs dist/PnwHome.wgt with the Samsung certificate profile in scripts/tizen-env.sh.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
[ -f "$root/scripts/tizen-env.sh" ] || { echo "scripts/tizen-env.sh is missing (copy scripts/tizen-env.example.sh and fill it in)." >&2; exit 64; }
. "$root/scripts/tizen-env.sh"
command -v tizen >/dev/null || { echo "The Tizen CLI is not on PATH." >&2; exit 69; }

rm -rf "$root/app/.buildResult"
tizen build-web -e ".*" -e "*.md" -- "$root/app"
tizen package -t wgt -s "$PROFILE" -- "$root/app/.buildResult"
mkdir -p "$root/dist"
wgt=$(ls -t "$root/app/.buildResult"/*.wgt | head -1)
cp "$wgt" "$root/dist/PnwHome.wgt"
rm -rf "$root/app/.buildResult"
echo "Built dist/PnwHome.wgt"
