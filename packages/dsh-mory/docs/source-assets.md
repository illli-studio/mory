# Original Mory website assets in the DSH client

The native DSH plugin reuses these assets from the same Mory repository:

- `apps/web/src/styles.css`: the full stylesheet, including all historical layout
  passes in their original order. Later overrides are part of the current site.
- `apps/web/public/mory-logo-premium.svg`: the original website brand mark.

Both are covered by the Mory repository license. The SVG refers to local font
families and keeps the website's existing fallback behavior. It embeds no font
files and introduces no external asset requests.

## Build boundary

`src/client.js` is the editable native React client. It registers through DSH's
module loader and contains one `__MORY_STYLES__` placeholder and one
`__MORY_LOGO__` placeholder. `scripts/build-client.mjs` generates the runtime
`client.js`, using only Node built-ins.

The build performs these mechanical CSS changes, preserving rule order and
keeping declarations intact unless explicitly listed:

1. Remove the `@import "tailwindcss"` statement. The native component markup uses
   the site's explicit classes; this build does not generate Tailwind utilities.
2. Wrap the website rules in native `@scope (.mory-app)`. Replace the website
   `:root`, `html`, `body` and `#root` selector tokens with local `:scope` tokens.
   Bind website `data-theme` selectors to that same local root, including
   selectors that originally addressed a themed `body`.
3. Turn the website's `@theme inline` declaration block into `:scope` CSS
   variables. The block only defines the site's semantic color variables.
4. Turn width-only `@media` conditions into `@container mory` conditions. Keep
   mixed conditions such as width plus orientation as media rules.
5. Prefix website animation/keyframe names with `mory-site-` so their names do not
   collide with other DSH plugins. Keep repeated keyframe definitions in place.
6. Prepend only the external `.mory-app` container setup: inline-size query
   containment, a named `mory` container, relative positioning, stacking
   isolation, full available height and panel scrolling. Native component layout
   adjustments appended in the Client source handle product-shell height and
   panel-local overlays.

No stylesheet is attached to the document root, no global theme is set, and no
iframe or second application root is created. Native `@scope` and container query
support are required in the connected browser.

## Rebuilding outside the repository

An author build prefers the original repository assets when present and writes
byte-for-byte source snapshots to `assets/website-styles.css` and
`assets/mory-logo-premium.svg`. The snapshots are included in the npm package.
The build falls back to those snapshots when the repository's `apps/web` sources
are absent, so an extracted package remains independently rebuildable.

`assets/source.json` records the original repository paths and SHA-256 hashes;
it intentionally contains no timestamp or machine-specific absolute paths.
Source snapshots remain unmodified. The generated CSS is embedded as a string,
and the original SVG is embedded as a percent-encoded data URL. The distribution
icon is also refreshed from that same SVG.

## Marketplace raster icon

`assets/market-icon.png` is a 512×512 PNG storefront tile for directories that
accept only GitHub-hosted raster images. It retains the original SVG's colors,
rounded paper layers, and two-line ME.MORY lockup. The native DSH icon export
continues to use `icon.svg`.

The optional authoring helper `scripts/build-market-icon.py` reads the original
SVG geometry and uses Pillow to rasterize it at four times the output size
before downsampling. Its text uses a local Cooper Black font when available,
otherwise Georgia Bold (used for the committed PNG); it does not distribute or
download fonts. Pass `--font` to select another locally licensed bold serif font.
This helper is separate from the Node-only runtime build:

```sh
python scripts/build-market-icon.py
```

The PNG follows the same project license as the original artwork. Its public
marketplace URL is:

```text
https://raw.githubusercontent.com/illli-studio/mory/main/packages/dsh-mory/assets/market-icon.png
```

Run `npm run build`, `npm test`, and `npm pack --dry-run` before publishing. To
check the snapshot fallback, extract the npm archive outside this repository and
run `npm run build` and `npm pack --dry-run` there. The build must report
`packaged source snapshot` for both assets in that check.
