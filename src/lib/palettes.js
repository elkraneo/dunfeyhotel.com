// Topic category colors — one vocabulary across the whole site (front desk
// chips, observatory charts). 19 hues per theme: distinguishable from each
// other, ≥4.5:1 for white chip text, and matched to each theme's paper.
export const PALETTES = {
  ledger: [
    "#8c1d22", "#9a6b1f", "#2f6f3e", "#1f4e79", "#b3541e",
    "#6d3e8e", "#0f766e", "#c43e4b", "#5a6e1f", "#2e7fb8",
    "#a34708", "#4a44a8", "#1f8a55", "#a23a78", "#8a7a14",
    "#176d8c", "#9c5230", "#6a7a2a", "#5d3a9b",
  ],
  night: [
    "#e2858d", "#d9b35e", "#8fbf94", "#85a8d4", "#e0a268",
    "#c49ad4", "#6fc7be", "#ef8f98", "#b9cb8c", "#94bee0",
    "#e99d62", "#aba5df", "#7fd0a7", "#d88fb6", "#cfbe65",
    "#8ac4dc", "#e19a7a", "#b8c37a", "#b49be0",
  ],
  cupertino: [
    "#d70015", "#c93400", "#937400", "#248a3d", "#0c817b",
    "#008299", "#0071a4", "#0040dd", "#3634a3", "#8944ab",
    "#d30f45", "#7f6545", "#365314", "#155e75", "#9d174d",
    "#4d7c0f", "#5b21b6", "#b25000", "#0f766e",
  ],
  "cupertino-night": [
    "#ff453a", "#ff9f0a", "#ffd60a", "#32d74b", "#66d4cf",
    "#5ac8f5", "#64d2ff", "#0a84ff", "#7d7aff", "#bf5af2",
    "#ff375f", "#ac8e68", "#a2d149", "#63e6e2", "#ff6482",
    "#8fd158", "#5e5ce6", "#ffb340", "#30d158",
  ],
};

// Client-side only: resolves the palette for the active theme.
export const themePalette = () =>
  PALETTES[document.documentElement.dataset.theme] ?? PALETTES.ledger;
