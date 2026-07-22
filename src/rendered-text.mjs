import { decodeHTML } from "entities";

// Detection-only normalization uses entities' complete WHATWG named-reference
// table and legacy text-state parsing, including numeric references without a
// semicolon. It intentionally does not recursively decode the resulting text.
export function decodeRenderedCharacterReferences(source) {
  if (typeof source !== "string" || !source.includes("&")) return source;
  return decodeHTML(source);
}
