const NAMED_CHARACTER_REFERENCES = Object.freeze({
  AMP: "&",
  ApplyFunction: "\u2061",
  GT: ">",
  InvisibleComma: "\u2063",
  InvisibleTimes: "\u2062",
  LT: "<",
  NewLine: "\n",
  NoBreak: "\u2060",
  NonBreakingSpace: "\u00a0",
  QUOT: "\"",
  Tab: "\t",
  UnderBar: "_",
  ZeroWidthSpace: "\u200b",
  amp: "&",
  apos: "'",
  bsol: "\\",
  colon: ":",
  comma: ",",
  gt: ">",
  hyphen: "\u2010",
  lcub: "{",
  lowbar: "_",
  lpar: "(",
  lsqb: "[",
  lt: "<",
  nbsp: "\u00a0",
  period: ".",
  quest: "?",
  quot: "\"",
  rcub: "}",
  rpar: ")",
  rsqb: "]",
  semi: ";",
  sol: "/",
  zwj: "\u200d",
  zwnj: "\u200c",
});

const MATHEMATICAL_ALPHABETS = Object.freeze({
  fr: Object.freeze({
    upper: 0x1d504,
    lower: 0x1d51e,
    exceptions: Object.freeze({ C: 0x212d, H: 0x210c, I: 0x2111, R: 0x211c, Z: 0x2128 }),
  }),
  opf: Object.freeze({
    upper: 0x1d538,
    lower: 0x1d552,
    exceptions: Object.freeze({ C: 0x2102, H: 0x210d, N: 0x2115, P: 0x2119, Q: 0x211a, R: 0x211d, Z: 0x2124 }),
  }),
  scr: Object.freeze({
    upper: 0x1d49c,
    lower: 0x1d4b6,
    exceptions: Object.freeze({
      B: 0x212c,
      E: 0x2130,
      F: 0x2131,
      H: 0x210b,
      I: 0x2110,
      L: 0x2112,
      M: 0x2133,
      R: 0x211b,
      e: 0x212f,
      g: 0x210a,
      o: 0x2134,
    }),
  }),
});

function mathematicalNamedReference(name) {
  const match = name.match(/^([A-Za-z])(fr|opf|scr)$/u);
  if (!match) return null;
  const [, letter, alphabetName] = match;
  const alphabet = MATHEMATICAL_ALPHABETS[alphabetName];
  const exception = alphabet.exceptions[letter];
  if (exception !== undefined) return String.fromCodePoint(exception);
  const lower = letter.toLowerCase();
  const offset = lower.codePointAt(0) - "a".codePointAt(0);
  return String.fromCodePoint(letter === lower ? alphabet.lower + offset : alphabet.upper + offset);
}

function numericCharacterReference(value, radix) {
  const codePoint = Number.parseInt(value, radix);
  if (
    !Number.isInteger(codePoint)
    || codePoint === 0
    || codePoint > 0x10ffff
    || (codePoint >= 0xd800 && codePoint <= 0xdfff)
  ) return "\ufffd";
  return String.fromCodePoint(codePoint);
}

export function decodeRenderedCharacterReferences(source) {
  if (typeof source !== "string" || !source.includes("&")) return source;
  return source.replace(
    /&(?:#(?:(?:[xX](?<hex>[0-9A-Fa-f]{1,6}))|(?<decimal>[0-9]{1,7}))|(?<name>[A-Za-z][A-Za-z0-9]{1,31}));/gu,
    (reference, ...arguments_) => {
      const groups = arguments_.at(-1);
      if (groups.hex !== undefined) return numericCharacterReference(groups.hex, 16);
      if (groups.decimal !== undefined) return numericCharacterReference(groups.decimal, 10);
      return NAMED_CHARACTER_REFERENCES[groups.name]
        ?? mathematicalNamedReference(groups.name)
        ?? reference;
    },
  );
}
