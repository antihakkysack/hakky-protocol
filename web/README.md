# HAKKY website

Static personal-project site for `hakky.xyz`. Serve it locally with `npm run preview`.

`data/launch.json` controls the fail-closed public state:

- `prelaunch`: no mint address or trading link is rendered;
- `curve-live` or `graduated` with `availability: "unavailable"`: the known
  lifecycle stage is shown, but no mint, evidence, or destination is rendered;
- `curve-live` with `availability: "verified"`: the exact nested v2 proof facts
  and canonical destinations are rendered only after both canonical artifacts
  match. LP irreversibility remains explicitly pending until graduation proof.

The HTML ships with a prominent prelaunch warning and hidden live actions. If JavaScript or launch-record loading fails, the warning remains and the live actions stay hidden.

Promote the record only through the deterministic proof-bound builder after
both canonical artifacts pass readback:

```powershell
rtk npm run build:curve-live-record -- --published-at <exact-ISO-8601-UTC-timestamp>
```

The command requires an operator-supplied publication time after both artifact
observations, copies all variable public evidence from the two canonical
artifacts, rejects extra or failed fields, and leaves the source record
untouched when validation or atomic replacement fails. Do not hand-assemble
the verified proof object.

Run `npm run check` before deployment. The site has no wallet connector, tracking script, backend dependency, or Hetzner dependency.
