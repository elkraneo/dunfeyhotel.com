// Resource-type icons: inline SVG strings (stroke, currentColor) shared by
// Astro components and client-side renderers. Mirrors the app's SF Symbols.

export const TYPE_LABELS = {
  samplecode: "Sample code",
  documentation: "Documentation",
  guide: "Guide",
  developerForum: "Forum",
  download: "Download",
};

const svg = (paths) =>
  `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const RESOURCE_ICONS = {
  samplecode: svg('<path d="M5.2 4.8 2 8l3.2 3.2M10.8 4.8 14 8l-3.2 3.2"/>'),
  documentation: svg(
    '<path d="M4 1.8h5.5L12 4.3v9.9H4z"/><path d="M9.5 1.8v2.5H12"/><path d="M6 8h4M6 10.5h4"/>'
  ),
  guide: svg(
    '<path d="M3.5 2.5h6.5a2.5 2.5 0 0 1 2.5 2.5v8.5H6a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M12.5 10.5H6a2.5 2.5 0 0 0-2.5 2.5"/>'
  ),
  developerForum: svg('<path d="M2.5 3h11v7.5H8L4.5 13.5v-3h-2z"/>'),
  download: svg('<path d="M8 2.5v7.5M5 7.5 8 10.5l3-3"/><path d="M3 13.5h10"/>'),
};
