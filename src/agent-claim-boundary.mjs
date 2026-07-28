import { decodeRenderedCharacterReferences } from "./rendered-text.mjs";

const INVISIBLE_OR_DIRECTIONAL_CHARACTERS = /[\p{Cf}\u034f\u115f\u1160\u17b4\u17b5\u3164\uffa0\ufe00-\ufe0f\u{e0100}-\u{e01ef}]/gu;

const AGENT_CLAUSE_PATTERN = /\bHakkyAgent\b(?<body>(?:(?!\bHakkyAgent\b|[.!?;]).){0,240})/giu;

const PROHIBITED_CLAIM_PATTERNS = Object.freeze([
  /\b(?:labels?|classif(?:y|ies|ied|ying)|marks?|rates?)\b.{0,60}\btransactions?\b.{0,40}\b(?:good|bad|safe)\b/giu,
  /\b(?:labels?|classif(?:y|ies|ied|ying)|marks?|rates?|verif(?:y|ies|ied|ying))\b.{0,40}\b(?:good|bad|safe)\b.{0,40}\btransactions?\b/giu,
  /\baudits?\b.{0,40}\b(?:(?:any|arbitrary|all|every|other|third-party)\s+)?tokens?\b/giu,
  /\bpredicts?\b.{0,40}\bscams?\b/giu,
  /\b(?:removes?|eliminates?|erases?)\b.{0,40}\bfinancial\s+risk\b/giu,
  /\bverif(?:y|ies|ied|ying)\b.{0,60}\b(?:all|every)\b(?:\s+[\p{L}\p{N}\p{M}-]+){0,5}\s+transactions?\b/giu,
  /\b(?:universal|all|every)\b(?:\s+[\p{L}\p{N}\p{M}-]+){0,4}\s+transactions?\s+verification\b/giu,
  /\buniversal\b.{0,40}\bverification\b.{0,40}\btransactions?\b/giu,
  /\b(?:provides?|offers?|performs?)\b.{0,40}\bverification\b.{0,40}\b(?:all|every)\b(?:\s+[\p{L}\p{N}\p{M}-]+){0,5}\s+transactions?\b/giu,
  /\bverif(?:y|ies|ied|ying)\b.{0,60}\btransactions?\b.{0,20}\buniversally\b/giu,
  /\b(?:detects?|spots?|identifies?)\b.{0,40}\bscams?\b/giu,
  /\bscam\s+(?:detection|detector)\b/giu,
  /\bguarantee(?:s|d|ing)?\b.{0,40}\b(?:safe|safety|returns?)\b/giu,
  /\bguaranteed\b.{0,20}\b(?:safe|safety|returns?)\b/giu,
]);

const LOCAL_NEGATION = /(?:\b(?:do|does|did|will|would|can|could|should|shall|is|are|was|were|has|have|had)\s+not|\b(?:don't|doesn't|didn't|won't|wouldn't|can't|couldn't|shouldn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't)|\bcannot|\bnever|\bno)(?:\s+(?:a|an|the|claim|claims|claimed|promise|promises|promised|guarantee|guarantees|guaranteed|provide|provides|provided|offer|offers|offered|purport|purports|purported|attempt|attempts|attempted|try|tries|tried|to|act|acts|acted|serve|serves|served|function|functions|functioned|as)){0,4}\s*$/iu;

function normalizedClaimText(source) {
  return decodeRenderedCharacterReferences(source)
    .normalize("NFKC")
    .replace(INVISIBLE_OR_DIRECTIONAL_CHARACTERS, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function isExplicitlyNegated(context) {
  return LOCAL_NEGATION.test(context);
}

export function hasUnsupportedAgentClaim(source) {
  if (typeof source !== "string") return false;
  const normalized = normalizedClaimText(source);
  AGENT_CLAUSE_PATTERN.lastIndex = 0;
  for (const clauseMatch of normalized.matchAll(AGENT_CLAUSE_PATTERN)) {
    if (normalized[clauseMatch.index + clauseMatch[0].length] === "?") continue;
    const body = clauseMatch.groups?.body ?? "";
    for (const pattern of PROHIBITED_CLAIM_PATTERNS) {
      pattern.lastIndex = 0;
      for (const claimMatch of body.matchAll(pattern)) {
        if (!isExplicitlyNegated(body.slice(0, claimMatch.index))) return true;
      }
    }
  }
  return false;
}
