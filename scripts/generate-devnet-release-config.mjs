import { runDevnetReleaseConfigCli } from "../src/devnet-release-config.mjs";

await runDevnetReleaseConfigCli({ moduleUrl: import.meta.url });
