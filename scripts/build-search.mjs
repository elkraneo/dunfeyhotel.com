#!/usr/bin/env node
// Build the Pagefind index: the rendered site plus full transcript text as
// custom records pointing at session pages. Search displays excerpts only,
// deep-linking to the source — the text itself is never rendered as a page.

import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as pagefind from "pagefind";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dist = join(root, "dist");
const trDir = join(root, "data", "transcripts", "eng");

const sessions = JSON.parse(
  await readFile(join(root, "data", "normalized", "sessions.json"), "utf8")
);
const byId = new Map(sessions.map((s) => [s.id, s]));

const { index } = await pagefind.createIndex();
await index.addDirectory({ path: dist });

let added = 0;
let files = [];
try {
  files = await readdir(trDir);
} catch {
  console.log("no transcript cache — run etl/transcripts-cache.mjs; indexing pages only");
}
for (const file of files) {
  if (!file.endsWith(".txt")) continue;
  const id = file.slice(0, -4);
  const s = byId.get(id);
  if (!s) continue;
  const content = await readFile(join(trDir, file), "utf8");
  await index.addCustomRecord({
    url: `/sessions/${id}/`,
    content,
    language: "en",
    meta: { title: `${s.title} — transcript` },
    filters: { year: [String(s.year)], topic: s.topics },
  });
  added++;
}

// Lost & Found: every delisted session and resource gets its own record, so
// nothing Apple removed is excused from search. Each is marked "— lost & found"
// in the result title and tagged with a status filter (recoverable / removed).
let lostAdded = 0;
try {
  const lf = JSON.parse(
    await readFile(join(root, "data", "normalized", "lost-and-found.json"), "utf8")
  );
  const topics = JSON.parse(
    await readFile(join(root, "data", "normalized", "topics.json"), "utf8")
  );
  const topicTitle = new Map(topics.map((t) => [t.id, t.title]));
  for (const x of lf.items) {
    const kindLabel = x.kind === "session" ? "Session" : x.type ?? "Resource";
    const status = x.recoverable ? "recoverable" : "removed";
    const topic = topicTitle.get(x.primaryTopicId);
    const filters = { status: [status], kind: [x.kind] };
    if (x.year) filters.year = [String(x.year)];
    if (topic) filters.topic = [topic];
    await index.addCustomRecord({
      // Unique per item — Pagefind keys records by URL, so a shared
      // /lost-and-found/ would collapse all 743 into one. The #id anchor keeps
      // them distinct (and lets the page scroll to the row later).
      url: `/lost-and-found/#${x.id}`,
      content: `${x.title}. ${kindLabel}. Lost & found — ${status} from Apple’s catalog${
        x.year ? `, WWDC${String(x.year).slice(2)}` : ""
      }.`,
      language: "en",
      meta: { title: `${x.title} — lost & found`, status },
      filters,
    });
    lostAdded++;
  }
} catch (e) {
  console.log("no lost-and-found dataset; skipping lost records —", e.message);
}

await index.writeFiles({ outputPath: join(dist, "pagefind") });
await pagefind.close();
console.log(`search index written · ${added} transcripts · ${lostAdded} lost & found indexed`);
