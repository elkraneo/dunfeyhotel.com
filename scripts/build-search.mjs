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

await index.writeFiles({ outputPath: join(dist, "pagefind") });
await pagefind.close();
console.log(`search index written · ${added} transcripts indexed`);
