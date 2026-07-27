export const APPROVED_DECISIONS = Object.freeze([
  "included",
  "included-as-theme",
  "excluded-music-or-video",
  "excluded-duplicate-or-crosspost",
  "excluded-incidental-reply",
  "excluded-unrelated",
  "excluded-harmful-or-actionable",
  "excluded-unsupported-real-world-claim",
  "excluded-targeting-or-harassment",
  "excluded-third-party-copyright",
  "unavailable-or-removed",
]);

const REVIEWED_ITEMS = Object.freeze({
  t1_n8v5b9v: Object.freeze({
    decision: "included-as-theme",
    reason: "Minimal Red Team self-description; the surrounding hypothetical is excluded.",
    destination: "Transmission 001",
  }),
  t1_n9hr5l5: Object.freeze({
    decision: "included-as-theme",
    reason: "Effective acceleration motif retained; incidental navigation wordplay is omitted.",
    destination: "Transmission 001",
  }),
  t1_n9hy8pb: Object.freeze({
    decision: "included-as-theme",
    reason: "Effective acceleration and constructive AI intent retained; employment and personal claims are omitted.",
    destination: "Transmission 001",
  }),
  t1_o938291: Object.freeze({
    decision: "included",
    reason: "Direct Red Team Leader call-sign language.",
    destination: "Transmission 001",
  }),
  t3_1mu8lym: Object.freeze({
    decision: "included-as-theme",
    reason: "Karma question contributes the origin friction without preserving platform grievance.",
    destination: "Transmission 002",
  }),
  t3_1nfna6g: Object.freeze({
    decision: "included-as-theme",
    reason: "REDDTLAND as a place for visibly human writing.",
    destination: "Transmission 002",
  }),
  t3_1nn8nw2: Object.freeze({
    decision: "included-as-theme",
    reason: "Defines REDDTLAND, words that land, AI as a tool, and No Equals No Sequels; profanity, race, and religious claims are excluded.",
    destination: "Transmission 002 / 003",
  }),
  t3_1nptlf4: Object.freeze({
    decision: "included",
    reason: "Writing as a precise signal that lands without shouting.",
    destination: "Transmission 002 / 003",
  }),
  t1_ndwnv2f: Object.freeze({
    decision: "included-as-theme",
    reason: "AI-as-hammer metaphor retained; direct insults are excluded.",
    destination: "Transmission 003",
  }),
  t1_ndwrj0y: Object.freeze({
    decision: "included-as-theme",
    reason: "Human responsibility for AI-assisted work retained; hostile phrasing is excluded.",
    destination: "Transmission 003",
  }),
  t1_ndxp425: Object.freeze({
    decision: "included-as-theme",
    reason: "Human authorship and fingerprints retained; targeting language is excluded.",
    destination: "Transmission 003",
  }),
  t1_neyj4q0: Object.freeze({
    decision: "included-as-theme",
    reason: "No Sequels and No Equals retained; real-person references and targeting are excluded.",
    destination: "Transmission 003",
  }),
  t3_1n7w8cx: Object.freeze({
    decision: "included",
    reason: "AI as a writing tool with human intent, value, and fingerprints.",
    destination: "Transmission 003",
  }),
  t3_1njscj6: Object.freeze({
    decision: "included-as-theme",
    reason: "No Sequels and No Equals retained; threats, real-person references, and copyrighted framing are excluded.",
    destination: "Transmission 003",
  }),
  t3_1nof80y: Object.freeze({
    decision: "included-as-theme",
    reason: "Hierarchy-to-network transition retained strictly as fiction; religious, historical, and astrological claims are excluded.",
    destination: "Transmission 004",
  }),
  t3_1nofzvi: Object.freeze({
    decision: "included-as-theme",
    reason: "Connection, networks, conversation, and empathy retained as a fictional lore frame rather than prophecy.",
    destination: "Transmission 004",
  }),
  t3_1no84p6: Object.freeze({
    decision: "included-as-theme",
    reason: "Atlantyss as a blurred script and memory world retained; hunger and supernatural implications are excluded.",
    destination: "Transmission 005",
  }),
  t3_1noeear: Object.freeze({
    decision: "included-as-theme",
    reason: "Atlantyss live-action frame retained; violent role-play phrasing is excluded.",
    destination: "Transmission 005",
  }),
  t3_1noh3ha: Object.freeze({
    decision: "included",
    reason: "Concise Atlantyss refrain and writing prompt.",
    destination: "Transmission 005",
  }),
  t1_nc5bq6h: Object.freeze({
    decision: "included-as-theme",
    reason: "Ledger, discipline, bounded risk, resilience, and responsibility retained; trading and personal-family details are excluded.",
    destination: "Transmission 006",
  }),
  t3_1mucjjl: Object.freeze({
    decision: "included-as-theme",
    reason: "Truth as a path rather than a possession.",
    destination: "Transmission 006",
  }),
});

function combinedText(item) {
  return [item.title, item.selftext, item.body]
    .filter((value) => typeof value === "string")
    .join("\n");
}

function result(decision, reason, destination = "Excluded") {
  return Object.freeze({ decision, reason, destination });
}

function isUnavailable(item, text) {
  return typeof item.removedByCategory === "string"
    || /\[(?:removed|deleted)\]/iu.test(text);
}

function isMusicOrVideo(item, text) {
  return item.isVideo === true
    || item.postHint === "rich:video"
    || item.postHint === "hosted:video"
    || /(?:youtube\.com|youtu\.be|spotify\.com|soundcloud\.com|music\.apple\.com)/iu.test(item.url ?? "")
    || /\b(?:official music video|lyrics?|soundtrack|music video)\b/iu.test(text);
}

function isHarmfulOrActionable(text) {
  return /\b(?:dehydrat(?:e|ed|ion)|starv(?:e|ed|ing|ation)|self[- ]?harm|suicid(?:e|al)|without water|fast(?:ing)? for (?:[2-9]|\d{2,}) days?)\b/iu.test(text)
    || /\b(?:how to kill|murder|shoot|stab|bomb|weapon instructions?|commit (?:a )?crime)\b/iu.test(text)
    || /\b(?:guaranteed|promise[sd]?)\b.{0,40}\b(?:profit|returns?|win rate)\b/iu.test(text)
    || /\b(?:trading|crypto|forex)\b.{0,80}\b(?:stop[- ]?loss|take profit|entry signal|leverage|win rate|returns?)\b/iu.test(text);
}

function isTargetingOrHarassment(text) {
  return /\b(?:idiot|moron|stupid|trash|scum|loser|must be punished|go after|destroy them|doxx?)\b/iu.test(text)
    || /\b(?:racist|racial slur|hate speech)\b/iu.test(text);
}

function isUnsupportedClaim(text) {
  return /\b(?:astrolog(?:y|ical)|zodiac|age of aquarius|supernatural|prophecy|religion proves|science proves|scientifically true|historically proven|medical cure|miracle cure)\b/iu.test(text)
    || /\b(?:election fraud|political conspiracy|flat earth)\b/iu.test(text);
}

export function classifyLoreItem(item) {
  const reviewed = REVIEWED_ITEMS[item?.name];
  if (reviewed) return reviewed;

  const text = combinedText(item ?? {});
  if (isUnavailable(item ?? {}, text)) {
    return result(
      "unavailable-or-removed",
      "The listing reports removed, deleted, or unavailable content.",
    );
  }
  if (isMusicOrVideo(item ?? {}, text)) {
    return result(
      "excluded-music-or-video",
      "Music, lyrics, soundtrack, or video content is outside the approved lore corpus.",
    );
  }
  if (typeof item?.crosspostParent === "string") {
    return result(
      "excluded-duplicate-or-crosspost",
      "Crosspost or duplicate source is represented by its canonical item only.",
    );
  }
  if (item?.source === "reddtland-submissions" || item?.source === "reddtland-comments") {
    return result(
      "excluded-third-party-copyright",
      "Subreddit item was not present in the creator profile corpus, so authorship rights are not assumed.",
    );
  }
  if (isHarmfulOrActionable(text)) {
    return result(
      "excluded-harmful-or-actionable",
      "Unsafe physical, violent, illegal, financial-performance, or trading instruction is excluded.",
    );
  }
  if (isTargetingOrHarassment(text)) {
    return result(
      "excluded-targeting-or-harassment",
      "Direct targeting, insults, harassment, or hateful framing is excluded.",
    );
  }
  if (isUnsupportedClaim(text)) {
    return result(
      "excluded-unsupported-real-world-claim",
      "Unsupported religious, historical, political, scientific, medical, or supernatural claim is excluded.",
    );
  }
  if (item?.source === "profile-comments") {
    return result(
      "excluded-incidental-reply",
      "Incidental profile reply does not contribute a recurring HAKKY lore principle.",
    );
  }
  return result(
    "excluded-unrelated",
    "Written item is outside the approved HAKKY origin narrative.",
  );
}
