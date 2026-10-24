# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-10-23

### Added
- LG webOS package (`webos/`): `appinfo.json`, LG icon sizes, `build.sh` (ares-package) and
  `install.sh`; `docs/WEBOS.md` covers Developer Mode, device registration and install.
- webOS backend in `platform.js`: lists the LG ribbon's launch points and launches apps over the
  Luna bus using the built-in `PalmServiceBridge`, with a fallback when listing is refused.
- Dock entries carry LG webOS app ids next to Tizen and Android ids.
- `?webosmock=1` preview flag that fakes the Luna bridge so the webOS path can be checked on a desktop.
- GitHub Actions job that packages the IPK and uploads it as an artifact.

### Changed
- The home screen also swallows LG's Back key (461), as it does Tizen's (10009).

## [1.2.0] - 2026-10-23

### Added
- Android TV, Google TV and Fire TV support from one APK (`android/`): a Kotlin WebView shell
  around the shared web core, a `PNWAndroid` bridge that lists and launches installed apps, and
  manifest entries so it appears in the Leanback row and can be chosen as the Home app.
- `android/build.sh` and `docs/ANDROID.md` (toolchain setup without Android Studio, ADB install,
  setting it as Home, emulator).
- Dock entries carry Android package names next to Tizen IDs.
- GitHub Actions job that builds the debug APK and uploads it as an artifact.
- Dock fill: when fewer than six configured apps are installed, the dock is topped up with the
  device's other launcher apps, so a new device never shows an empty row.

### Changed
- `platform.js` is now a three-backend platform layer (Tizen, Android, desktop mock) with shared
  id-then-name matching.

### Fixed
- The dock row scrolled as soon as focus left the first tile, clipping it. It now scrolls only
  when the focused tile would leave the visible strip, in either direction.

## [1.1.0] - 2026-10-23

### Added
- Burnt orange theme (`theme: 'orange'` in `app/js/config.js`, or `?theme=orange` in a desktop preview): burnt orange ground, cream labels, navy as the single accent for the focused tile, anchor brown ambient screen.

### Changed
- Stylesheet colours are now semantic tokens (ground, accent, label, text, line) so a theme is a single override block. The default navy theme renders exactly as before.

## [1.0.0] - 2026-10-23

### Added
- Home screen for Samsung Tizen TVs: clock, greeting that follows the time of day, and a numbered dock of installed apps resolved by Tizen app ID or name.
- Rotating photo backdrop (crossfade and slow drift, order shuffled once per day) with on-screen caption, photographer and licence.
- Twelve public domain and CC0 photographs of Mount Rainier, Tacoma and the South Puget Sound.
- Ambient screensaver (clock over the dimmed photo) after five minutes idle; any key wakes it.
- Evening dimming window.
- Build and install scripts for the Tizen CLI, and an install guide.
- Desktop preview mode with a mock app list and query flags for each state.

### Notes
- Package ID is 10 characters (`PnwHome001`), which Samsung TVs require; an 8-character ID fails to install with error 118019.
- Tested on a 2018 UN65NU8000 (Tizen 4.0).

[Unreleased]: https://github.com/poyfather/PNW-home/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/poyfather/PNW-home/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/poyfather/PNW-home/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/poyfather/PNW-home/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/poyfather/PNW-home/releases/tag/v1.0.0
