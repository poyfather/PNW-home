# Contributing to PNW Home

Thanks for helping. The most useful contributions right now are **model reports** (does it install and render on your Samsung TV?) and fixes for the Tizen 4.0 web engine.

## Development setup

You can work on the UI without a TV:

```sh
git clone https://github.com/poyfather/PNW-home.git
cd PNW-home/app
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/index.html`. Without `window.tizen` the app runs in preview mode with a mock app list. Use the query flags listed in the README (`?focus=N`, `?ambient=1`, `?idle=MS`, `?night=1`, `?at=...`) to reach each state.

To build and install on a TV you need Samsung's Tizen CLI and a Samsung certificate for that TV. [docs/INSTALL.md](docs/INSTALL.md) covers it. Never commit `scripts/tizen-env.sh`; it holds your TV's device ID and is git-ignored.

## Code style

- **JavaScript:** ES5 only (`var`, function expressions, no arrow functions, no template literals, no `let` or `const`). The target engine is Chromium 56. Each file is an IIFE with `'use strict'`.
- **CSS:** flexbox and CSS variables, no CSS grid, no `gap`. Animate `transform` and `opacity` only, 150 to 400 ms, ease-out in and ease-in out. Keep the `prefers-reduced-motion` path working.
- **Colours and type:** stay inside the palette and type stack defined at the top of `app/css/tv.css`. Burnt Orange is for the focused tile only.
- **Copy:** sentence case, no exclamation points, no em or en dashes (use commas, periods, or "to" for ranges).
- Two-space indentation, single quotes in JavaScript.

## Checks

CI runs these on every push and pull request; run them locally first:

```sh
for f in app/js/*.js; do node --check "$f"; done
python3 -c "import json; json.load(open('app/photos/manifest.json'))"
xmllint --noout app/config.xml
```

There is no test suite yet; a headless-Chrome screenshot test would be a welcome addition.

## Pull requests

1. Open an issue first for anything beyond a small fix, so we agree on the approach.
2. Branch from `main`. Keep each PR to one change.
3. Fill in the PR template: what changed, why, and how you tested it (desktop preview, and which TV model if any).
4. Update `CHANGELOG.md` under **Unreleased**.
5. Attach a screenshot for anything visual.

## Reporting what your TV does

Use the **Model report** issue form. Include the model number, Tizen version (Settings → Support → About this TV), whether it installed, whether the fonts loaded (Futura vs Arial), and a photo of the screen if you can.

## Licence

By contributing you agree your code is released under the MIT licence in [LICENSE](LICENSE). Only add photos that are public domain or CC0, and list them in [CREDITS.md](CREDITS.md) and the manifest.
