# HAKKY prelaunch browser checklist

This checklist certifies the approved meme-first site only. It does not
authorize deployment, a wallet signature, a transaction, or any mainnet
action.

## Fixed runtime targets

- Desktop viewport: 1440 x 1000 CSS pixels.
- Mobile viewport: 390 x 844 CSS pixels.
- The local QA origin is `http://127.0.0.1:4173/`.
- The page must settle at `data-record-state="confirmed"`.
- The exact call sign must be visible and all seven lore transmissions must
  remain in the rendered document.

## Render and loading checks

- No horizontal overflow.
- No console errors.
- No page errors.
- No failed requests.
- The prelaunch warning remains visible after the launch record loads.
- Each screenshot is stored with its byte length and SHA-256 digest.
- The four runtime inputs (`index.html`, `app.js`, `styles.css`, and
  `data/launch.json`) are stored with byte lengths and SHA-256 digests.

## Prelaunch safety checks

- The future market route remains explanatory text only.
- The page contains no wallet or trading controls.
- The flow disclosure says it is not available during prelaunch.
- There is no trade destination, automatic signature, automatic send, or
  automatic retry.
- The certificate records `mainnetActionsAuthorized: false`.

## Launch boundary

An interactive connect, quote, preview, confirm, wallet-rejection recovery,
stale-state clearing, decoded-transaction equality, fee disclosure, and
expiry test sequence belongs to a separately approved launch interface. It
must not be inferred from this prelaunch certificate.
