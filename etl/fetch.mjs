#!/usr/bin/env node
// Fetch the current WWDC services feeds and archive them as a dated raw snapshot.
// Usage: node fetch.mjs [--env <token>]   (defaults to endpoints.json "current")
//
// Output: data/raw/snapshot-<snapshotId>-<updatedDate>/
//   contents.json, transcript-manifest-eng.json, config.json (if served)
//
// Snapshots are archived because Apple rewrites history between them
// (e.g. WWDC2024 went from 374 items in 2024 to 132 in 2026 after labs were pruned).

import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
let registry;
try {
  registry = JSON.parse(await readFile(join(here, "..", "data", "endpoints.json"), "utf8"));
} catch {
  console.error("No feed configuration. Copy etl/endpoints.example.json to data/endpoints.json and fill in the current environment (see README).");
  process.exit(1);
}

const envArg = process.argv.indexOf("--env");
const token = envArg !== -1 ? process.argv[envArg + 1] : registry.current;
const base = `${registry.cdnBase}/${token}`;

async function fetchJSON(name, { optional = false } = {}) {
  const res = await fetch(`${base}/${name}`, { headers: { "accept-encoding": "gzip" } });
  if (!res.ok) {
    if (optional) return null;
    throw new Error(`${name}: HTTP ${res.status}`);
  }
  return res.json();
}

console.log(`Fetching from environment ${token}`);
const contents = await fetchJSON("contents.json");
const updatedDate = contents.updated.slice(0, 10);
const snapDir = join(here, "..", "data", "raw", `snapshot-${contents.snapshotId}-${updatedDate}`);

try {
  await access(snapDir);
  console.log(`Snapshot ${contents.snapshotId} (${updatedDate}) already archived at ${snapDir}`);
  process.exit(0);
} catch {}

await mkdir(snapDir, { recursive: true });
await writeFile(join(snapDir, "contents.json"), JSON.stringify(contents));

const LANGS = ["eng", "jpn", "kor", "zho", "fra", "spa", "por"];
const extras = [
  ...LANGS.map((l) => `transcript-manifest-${l}.json`),
  "config.json",
  "articles.json",
  "discover.json",
  "event.json",
];
for (const name of extras) {
  const data = await fetchJSON(name, { optional: true });
  if (data) await writeFile(join(snapDir, name), JSON.stringify(data));
  console.log(`  ${name}: ${data ? "saved" : "not available"}`);
}

const meta = {
  environmentToken: token,
  snapshotId: contents.snapshotId,
  updated: contents.updated,
  fetchedAt: new Date().toISOString(),
  events: contents.events.map((e) => e.id),
  contentCount: contents.contents.length,
};
await writeFile(join(snapDir, "meta.json"), JSON.stringify(meta, null, 2));
console.log(`Archived snapshot ${contents.snapshotId} (${contents.contents.length} items, updated ${contents.updated}) → ${snapDir}`);
