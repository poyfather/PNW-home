#!/bin/sh
# Installs dist/PnwHome.wgt on the TV (Developer Mode on, Host PC IP = this Mac) and opens it.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
. "$root/scripts/tizen-env.sh"
command -v tizen >/dev/null || { echo "The Tizen CLI is not on PATH." >&2; exit 69; }
[ -f "$root/dist/PnwHome.wgt" ] || { echo "Run scripts/build.sh first." >&2; exit 66; }
sdb connect "$TV"
tizen install-permit -s "$TV"
tizen install -s "$TV" -n PnwHome.wgt -- "$root/dist"
tizen run -s "$TV" -p "$APP_ID"
