import assert from "node:assert/strict";
import test from "node:test";
import {
  MAINNET_SESSION_PATHS,
  serializeMainnetSessionJson,
} from "../src/mainnet-session-artifact.mjs";

const AUTHORIZATION =
  `Authorize only serialized transaction SHA-256 ${"a".repeat(64)} with maximum creation debit 1000000000 lamports.`;

test("only the exact public approval authorization sentence is allowed at its fixed path", () => {
  const envelope = { authorization: AUTHORIZATION };
  assert.equal(
    serializeMainnetSessionJson(envelope, {
      relativePath: MAINNET_SESSION_PATHS.approvalEnvelope,
    }).toString("utf8"),
    `${JSON.stringify(envelope, null, 2)}\n`,
  );

  for (const [value, options] of [
    [envelope, {}],
    [envelope, { relativePath: MAINNET_SESSION_PATHS.preview }],
    [{ authorization: "Bearer public-looking-but-forbidden" }, {
      relativePath: MAINNET_SESSION_PATHS.approvalEnvelope,
    }],
    [{ nested: { authorization: AUTHORIZATION } }, {
      relativePath: MAINNET_SESSION_PATHS.approvalEnvelope,
    }],
  ]) {
    assert.throws(
      () => serializeMainnetSessionJson(value, options),
      /mainnet-session-(?:secret-key|private-field)/u,
    );
  }
});
