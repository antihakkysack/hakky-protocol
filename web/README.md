# HAKKY website

Static personal-project site for `hakky.xyz`. Serve it locally with `npm run preview`.

`data/launch.json` controls the fail-closed public state:

- `prelaunch`: no mint address or trading link is rendered;
- `live`: the exact mint, creator, launch transaction and Solscan link, supply,
  decimals, authorities, zero creator balance, 80/20/0 allocation, creator-fee
  state, LP burn, spend/cap, verification time, Solscan mint URL, and Raydium
  URL are rendered only after both canonical proof artifacts match.

The HTML ships with a prominent prelaunch warning and hidden live actions. If JavaScript or launch-record loading fails, the warning remains and the live actions stay hidden.

Promote the record only through the deterministic proof-bound builder after
both canonical artifacts pass readback:

```powershell
rtk npm run build:live-record -- --verified-at <exact-ISO-8601-UTC-timestamp>
```

The command requires the operator-supplied final verification time, copies all
variable public evidence from the two canonical artifacts, rejects extra or
failed fields, and leaves the prelaunch record untouched when validation fails.
Do not hand-assemble the live proof object.

Run `npm run check` before deployment. The site has no wallet connector, tracking script, backend dependency, or Hetzner dependency.
