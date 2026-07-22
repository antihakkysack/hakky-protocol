# HAKKY website

Static personal-project site for `hakky.xyz`. Serve it locally with `npm run preview`.

`data/launch.json` controls the fail-closed public state:

- `prelaunch`: no mint address or trading link is rendered;
- `live`: the validated exact mint, Solscan URL, and Raydium URL are rendered with verified proof labels.

The HTML ships with a prominent prelaunch warning and hidden live actions. If JavaScript or launch-record loading fails, the warning remains and the live actions stay hidden.

Run `npm run check` before deployment. The site has no wallet connector, tracking script, backend dependency, or Hetzner dependency.
