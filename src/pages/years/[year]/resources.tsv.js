// Raw TSV of a year's referenced documents — a stable, agent-friendly export.
import { events, sessions, resourceById } from "../../../lib/data.js";

export function getStaticPaths() {
  return events.map((e) => ({ params: { year: String(e.year) }, props: { event: e } }));
}

export function GET({ props }) {
  const year = props.event.year;
  const seen = new Map();
  for (const s of sessions.filter((s) => s.year === year)) {
    for (const rid of s.resourceIds) {
      const r = resourceById.get(rid);
      if (!r) continue;
      const entry = seen.get(rid) ?? { ...r, referencedBy: [] };
      entry.referencedBy.push(s.id);
      seen.set(rid, entry);
    }
  }
  const clean = (v) => String(v ?? "").replaceAll("\t", " ").replaceAll("\n", " ");
  const rows = [
    ["type", "title", "url", "description", "referenced_by"].join("\t"),
    ...[...seen.values()]
      .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""))
      .map((r) =>
        [clean(r.type), clean(r.title), clean(r.url), clean(r.description), r.referencedBy.join(",")].join("\t")
      ),
  ];
  return new Response(rows.join("\n"), {
    headers: { "content-type": "text/tab-separated-values; charset=utf-8" },
  });
}
