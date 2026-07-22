# HAKKY website

Static personal-project site for `hakky.xyz`. Serve it locally with `npm run preview`.

`data/launch.json` controls the fail-closed public state:

- `prelaunch`: no mint address or trading link is rendered;
- `live`: the exact mint, creator, launch transaction and Solscan link, supply,
  decimals, authorities, zero creator balance, 80/20/0 allocation, creator-fee
  state, LP burn, spend/cap, verification time, Solscan mint URL, and Raydium
  URL are rendered only after both canonical proof artifacts match.

The HTML ships with a prominent prelaunch warning and hidden live actions. If JavaScript or launch-record loading fails, the warning remains and the live actions stay hidden.

Run `npm run check` before deployment. The site has no wallet connector, tracking script, backend dependency, or Hetzner dependency.
