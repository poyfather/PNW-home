# PNW Home on LG webOS

LG TVs run web apps natively, so the webOS package is the shared web core plus an
`appinfo.json`, packaged into an `.ipk` with LG's command-line tools. The dock talks to the
TV's application manager over the Luna service bus to list and launch apps.

| | LG webOS (2016 and later, webOS 3.0+) |
|---|---|
| Install | Developer Mode app on the TV plus `ares-install` over the network |
| Appears in | The LG Home ribbon, like any other app |
| Replace Home button | No. The Home button always opens LG's ribbon; pin PNW Home as the first tile |
| Tested on | Not yet on LG hardware. The Luna code path is exercised against a mock in the desktop preview |

## Build

```sh
npm install -g @webos-tools/cli        # ares-package, ares-setup-device, ares-install, ares-launch
webos/build.sh                          # -> dist/org.pnwhome.home_<version>_all.ipk
```

`build.sh` stages `app/` (minus the Tizen manifest) with `webos/appinfo.json` and the two LG icon
sizes (80 px and 130 px), then runs `ares-package --no-minify`. The IPK is about 9.5 MB, almost all
photos.

## Install

1. On the TV, install **Developer Mode** from the LG Content Store, sign in with an LG developer
   account (free), turn **Dev Mode Status** on, and restart when asked. Turn **Key Server** on and
   note the TV's IP address and the passphrase shown.
2. Register the TV once from your computer:
   ```sh
   ares-setup-device --add lgtv --info "host=<TV_IP>" --info "port=9922" --info "username=prisoner"
   ares-novacom --device lgtv --getkey          # enter the passphrase from the Dev Mode app
   ares-device --device lgtv --system-info      # should print the model and webOS version
   ```
3. Install and launch:
   ```sh
   webos/install.sh lgtv
   ```
4. On the TV: hold OK on a ribbon tile to enter edit mode and move **PNW Home** to the first
   position. The Home button still opens LG's ribbon; PNW Home is one press away.

Developer Mode sessions expire after 50 hours unless extended in the Dev Mode app; the app
stays installed until Dev Mode is turned off, which removes all sideloaded apps.

## How the webOS backend works

- `app/js/platform.js` picks the webOS backend when `window.PalmServiceBridge` exists. That
  object is the primitive LG's `webOSTV.js` library wraps; using it directly keeps the core free
  of vendor scripts.
- Listing: `luna://com.webos.applicationManager/listLaunchPoints` returns the tiles on the LG
  ribbon (`id`, `title`, `icon`). Dock entries are matched by their `webos` ids in `config.js`,
  then by name; the dock is topped up with the remaining launch points as on other platforms.
- Launching: `luna://com.webos.applicationManager/launch` with `{ id }`.
- Some firmware versions refuse `listLaunchPoints` to third-party apps. In that case the dock
  shows the configured apps unverified, and a launch failure tells you which one is missing.
- Keys: webOS sends Back as key code 461, which the home screen swallows like Tizen's 10009.
  `disableBackHistoryAPI` is set so the system does not navigate the page history on Back.

## webOS app IDs used

| App | webOS id |
|---|---|
| YouTube | `youtube.leanback.v4` |
| Netflix | `netflix` |
| Prime Video | `amazon` |
| Disney+ | `com.disney.disneyplus-prod` |
| Hulu | `hulu` |
| Peacock | `com.peacocktv.peacock` |
| Apple TV | `com.apple.appletv` |
| Web Browser | `com.webos.app.browser` |

Ids vary a little by region and firmware year. If one is wrong, the name match still finds the
app from the launch-point list; please report the correct id in a Model report issue.

## Preview the webOS path on a desktop

```sh
cd app && python3 -m http.server 8765
# http://127.0.0.1:8765/index.html?webosmock=1
```

`?webosmock=1` installs a fake `PalmServiceBridge` that answers `listLaunchPoints` with six
typical LG tiles and accepts `launch`, so the matching and fill logic can be checked without a TV.
