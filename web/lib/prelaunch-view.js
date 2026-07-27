import { validateLaunchRecord } from "./prelaunch-policy.js";

export function buildLaunchView(record) {
  const issues = validateLaunchRecord(record);
  if (issues.length) {
    throw new Error(`Invalid prelaunch record: ${issues.join("; ")}`);
  }
  return Object.freeze({
    state: "prelaunch",
    heading: "PRELAUNCH: No official HAKKY program or mint is published. Ignore addresses from replies, ads, or DMs.",
    program: "Not published",
    mint: "Not published",
    market: "Not initialized",
    curve: "Not live",
    pool: "Not live",
    proof: "Unavailable before verified launch state",
  });
}
