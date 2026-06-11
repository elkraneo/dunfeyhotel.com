#!/usr/bin/env node
// Map sessions to Apple's official YouTube uploads (@AppleDeveloper).
// Usage: node etl/youtube.mjs [path-to-tsv]   (default: runs yt-dlp itself)
//
// Output: etl/youtube-map.json — { sessionId: youtubeVideoId }, committed,
// so builds never require yt-dlp. Titles match on (year, normalized title).

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

let tsv;
if (process.argv[2]) {
  tsv = readFileSync(process.argv[2], "utf8");
} else {
  tsv = execFileSync(
    "yt-dlp",
    ["--flat-playlist", "--print", "%(id)s\t%(title)s", "https://www.youtube.com/@AppleDeveloper/videos"],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
  );
}

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const videos = [];
for (const line of tsv.split("\n")) {
  const [id, title] = line.split(/\\t|\t/); // yt-dlp may emit a literal \t
  if (!id || !title) continue;
  // "WWDC26: Session title | Apple"
  let m = title.match(/^WWDC(\d{2}):\s*(.+?)\s*\|\s*Apple\s*$/i);
  if (m) {
    videos.push({ id, year: 2000 + Number(m[1]), title: norm(m[2]) });
    continue;
  }
  // "Session title | WWDC26"
  m = title.match(/^(.+?)\s*\|\s*WWDC(\d{2})\s*$/i);
  if (m) videos.push({ id, year: 2000 + Number(m[2]), title: norm(m[1]) });
}

const sessions = JSON.parse(
  readFileSync(join(here, "..", "data", "normalized", "sessions.json"), "utf8")
);
const byKey = new Map(sessions.map((s) => [`${s.year}|${norm(s.title)}`, s.id]));

const map = {};
let misses = 0;
for (const v of videos) {
  const sessionId = byKey.get(`${v.year}|${v.title}`);
  if (sessionId) map[sessionId] = v.id;
  else misses++;
}

writeFileSync(join(here, "youtube-map.json"), JSON.stringify(map, null, 1));
console.log(
  `${videos.length} WWDC videos on the channel → ${Object.keys(map).length} matched to sessions (${misses} unmatched: keynotes, dailies, shorts)`
);
