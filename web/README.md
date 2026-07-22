# Hakky Protocol — Website

The public landing site for Hakky Protocol. It is a **single, self-contained
static file** ([`index.html`](index.html)) with no build step, no external
dependencies, and no trackers — inline CSS/JS only. It works offline and deploys
anywhere that serves static files.

## Preview locally

```bash
# from the repo root
npx serve web
# or simply open web/index.html in a browser
```

## Design notes

- **Palette:** Trust Teal `#0E9B8E` (verified/clean), Bitcoin Orange `#F7931A`
  (BTC references, used sparingly), Ink `#0A1E27`. Deliberately bright and
  high-contrast — the visual opposite of the dark aesthetic mixers use.
- **Light + dark themes** via `prefers-color-scheme` and a `data-theme` override.
- **Accessible:** semantic landmarks, visible focus states, `prefers-reduced-motion`
  respected, keyboard-navigable disclosure FAQ.
- Copy follows the launch positioning in [`../launch/`](../launch/): anti-mixer,
  transparent-by-design, honest about v1 custody, no price/return promises.

## Deploy

### GitHub Pages
A workflow at [`../.github/workflows/pages.yml`](../.github/workflows/pages.yml)
publishes the `web/` folder to GitHub Pages on every push to `main`. Enable it
under **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### Vercel / Netlify / Cloudflare Pages
Point the project at this repo and set the output/publish directory to `web`
(no build command needed).

## Before launch — replace placeholders

- `hakky.xyz` — the production domain (add a `CNAME` file here once configured).
- `@antihakkysack` — the final X/Twitter handle.
- The **"Illustrative · testnet"** proof-of-reserves figures — wire to live
  on-chain values (or keep the illustrative label) before promoting the peg.
