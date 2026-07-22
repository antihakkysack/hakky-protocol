const CLAIM_PATTERNS = Object.freeze([
  /\bHakkyAgent\b(?<context>(?:(?![.!?;]|\bHakkyAgent\b).){0,80}?)\bverif(?:y|ies|ied)\b(?:(?![.!?;]|\bverif(?:y|ies|ied)\b).){0,60}?\b(?:all|every|good|bad|safe)\b(?:\s+[\p{L}\p{N}\p{M}-]+){0,4}\s+transactions?\b(?!\s*\?)/giu,
  /\bHakkyAgent\b(?<context>(?:(?![.!?;]|\bHakkyAgent\b).){0,80}?)\bguarantee(?:s|d)?\b(?:(?![.!?;]|\bguarantee(?:s|d)?\b).){0,40}?\b(?:safe|safety|scam\s+(?:detection|detector)|returns?)\b(?!\s*\?)/giu,
]);

const EXPLICIT_NEGATION = /(?:\b(?:do|does|did|will|would|can|could|should|shall|is|are|was|were|has|have|had)\s+not(?:\s+(?:a|an|the))?|\bcannot|\bnever)\s*$/iu;

function normalizedClaimText(source) {
  return source.replace(/\s+/gu, " ").trim();
}

function isExplicitlyNegated(context) {
  return EXPLICIT_NEGATION.test(context);
}

export function hasUnsupportedAgentClaim(source) {
  const normalized = normalizedClaimText(source);
  for (const pattern of CLAIM_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of normalized.matchAll(pattern)) {
      if (!isExplicitlyNegated(match.groups?.context ?? "")) return true;
    }
  }
  return false;
}
