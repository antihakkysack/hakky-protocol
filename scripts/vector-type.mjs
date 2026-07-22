const GLYPHS = {
  " ": { width: 3, path: "" },
  ".": { width: 2, path: "M1 6.8v.2" },
  ",": { width: 2, path: "M1 6.5v.5l-.6.8" },
  "·": { width: 2, path: "M1 3.4v.2" },
  "/": { width: 5, path: "M0 7 5 0" },
  "%": { width: 5, path: "M0 7 5 0M.5.5h1.5v1.5H.5zM3 5h1.5v1.5H3z" },
  "0": { width: 5, path: "M1 0h3l1 1v5l-1 1H1L0 6V1zM1 6 4 1" },
  "1": { width: 5, path: "M1 1 2.5 0v7M0 7h5" },
  A: { width: 5, path: "M0 7V2l2.5-2L5 2v5M0 4h5" },
  C: { width: 5, path: "M5 0H1L0 1v5l1 1h4" },
  E: { width: 5, path: "M5 0H0v7h5M0 3.5h4" },
  F: { width: 5, path: "M0 0v7M0 0h5M0 3.5h4" },
  G: { width: 5, path: "M5 1 4 0H1L0 1v5l1 1h4V4H3" },
  H: { width: 5, path: "M0 0v7M5 0v7M0 3.5h5" },
  I: { width: 5, path: "M0 0h5M2.5 0v7M0 7h5" },
  K: { width: 5, path: "M0 0v7M5 0 0 4M2 2.5 5 7" },
  L: { width: 5, path: "M0 0v7h5" },
  M: { width: 5, path: "M0 7V0l2.5 3L5 0v7" },
  N: { width: 5, path: "M0 7V0l5 7V0" },
  O: { width: 5, path: "M1 0h3l1 1v5l-1 1H1L0 6V1z" },
  P: { width: 5, path: "M0 7V0h4l1 1v2l-1 1H0" },
  R: { width: 5, path: "M0 7V0h4l1 1v2l-1 1H0M3 4l2 3" },
  S: { width: 5, path: "M5 0H1L0 1v2l1 1h3l1 1v1l-1 1H0" },
  T: { width: 5, path: "M0 0h5M2.5 0v7" },
  U: { width: 5, path: "M0 0v6l1 1h3l1-1V0" },
  Y: { width: 5, path: "M0 0l2.5 3.5L5 0M2.5 3.5V7" }
};

function format(value) {
  return Number(value.toFixed(3));
}

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function vectorText(content, options) {
  const {
    x,
    y,
    height,
    letterSpacing = 0,
    color,
    strokeWidth = 0.9
  } = options;
  const scale = height / 7;
  const spacing = letterSpacing / scale;
  let cursor = 0;
  const paths = [];

  for (const character of content) {
    const glyph = GLYPHS[character];
    if (!glyph) {
      throw new Error(`Unsupported vector glyph: ${character}`);
    }
    if (glyph.path) {
      paths.push(`<path d="${glyph.path}" transform="translate(${format(cursor)} 0)"/>`);
    }
    cursor += glyph.width + 1 + spacing;
  }

  const label = escapeAttribute(content);
  return {
    svg: `<g role="img" aria-label="${label}" data-copy="${label}" transform="translate(${x} ${y}) scale(${format(scale)})" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="square" stroke-linejoin="miter">${paths.join("")}</g>`,
    width: format(Math.max(0, (cursor - 1 - spacing) * scale))
  };
}
