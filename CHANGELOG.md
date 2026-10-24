# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/poyfather/PNW-home/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/poyfather/PNW-home/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/poyfather/PNW-home/releases/tag/v1.0.0
