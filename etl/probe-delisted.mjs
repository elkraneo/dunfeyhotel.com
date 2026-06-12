// Probe the recoverability of delisted WWDC content.
//
// Apple removes sessions and resources from the catalog over time; our
// archived snapshots still hold their original Apple URLs. This walks the
// snapshot timeline, finds everything present then but gone from the current
// catalog, and probes each old URL: a working 2xx means Apple still serves it
// (recoverable — a link Apple's own site no longer surfaces); a 404/410 is a
// tombstone (our archive is the only record it existed).
//
// Network-heavy, so it runs OUTSIDE the site build: results cache to
// data/delisted-status.json (committed), refreshed periodically by the weekly
// Action. normalize.mjs reads the cache; it never probes during a build.
//
// Usage: node etl/probe-delisted.mjs [--all]   (--all re-probes cached URLs)

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const rawRoot = join(here, "..", "data", "raw");
const cachePath = join(here, "..", "data", "delisted-status.json");
const TALK_TYPES = new Set(["Video", "Session"]);
const reprobeAll = process.argv.includes("--all");
const today = new Date().toISOString().slice(0, 10);

const snapDirs = (await readdir(rawRoot))
  .filter((d) => d.startsWith("snapshot-"))
  .sort();

const load = async (dir) => {
  try {
    return JSON.parse(await readFile(join(rawRoot, dir, "contents.json"), "utf8"));
  } catch {
    return null;
  }
};

// Current catalog = the highest snapshotId.
let current = null;
let currentId = -1;
const snaps = [];
for (const dir of snapDirs) {
  const c = await load(dir);
  if (!c) continue;
  snaps.push({ dir, c });
  if ((c.snapshotId ?? 0) > currentId) {
    currentId = c.snapshotId ?? 0;
    current = c;
  }
}
const curSessionIds = new Set(current.contents.map((c) => c.id));
const curResourceIds = new Set((current.resources ?? []).map((r) => r.id));
const curEventIds = new Set(current.events.filter((e) => e.id.startsWith("wwdc")).map((e) => e.id));

// Union of delisted items across all older snapshots → the URLs to probe.
const urls = new Set();
for (const { c } of snaps) {
  if (c.snapshotId === currentId) continue;
  for (const r of c.resources ?? []) {
    if (!curResourceIds.has(r.id) && r.url?.startsWith("http")) urls.add(r.url);
  }
  for (const s of c.contents ?? []) {
    if (
      TALK_TYPES.has(s.type) &&
      curEventIds.has(s.eventId) &&
      !curSessionIds.has(s.id) &&
      s.webPermalink?.startsWith("http")
    ) {
      urls.add(s.webPermalink);
    }
  }
}

let cache = {};
try {
  cache = JSON.parse(await readFile(cachePath, "utf8"));
} catch {}

const toProbe = [...urls].filter((u) => reprobeAll || !cache[u]);
console.log(`${urls.size} delisted URLs; probing ${toProbe.length} (${urls.size - toProbe.length} cached)`);

const probe = async (url) => {
  // HEAD first; some Apple endpoints reject HEAD, so fall back to a ranged GET.
  for (const method of ["HEAD", "GET"]) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      // No Range header: Apple's CDN answers a ranged request to a 404 page
      // with 206, masking the miss. A plain request reports the true status.
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      clearTimeout(t);
      if (method === "HEAD" && (res.status === 405 || res.status === 403)) continue;
      return { status: res.status, finalUrl: res.url };
    } catch {
      if (method === "GET") return { status: 0, finalUrl: url };
    }
  }
  return { status: 0, finalUrl: url };
};

// Bounded concurrency.
const POOL = 12;
let i = 0;
async function worker() {
  while (i < toProbe.length) {
    const url = toProbe[i++];
    const { status, finalUrl } = await probe(url);
    // Recoverable = Apple still serves real content (2xx, and not bounced to a
    // generic listing/account page — those redirects mean the item is gone).
    const bounced = /\/(videos|account|sample-code)\/?$/.test(finalUrl) && finalUrl !== url;
    const recoverable = status >= 200 && status < 300 && !bounced;
    cache[url] = { status, recoverable, finalUrl: finalUrl !== url ? finalUrl : undefined, checkedAt: today };
    if (i % 25 === 0) console.log(`  …${i}/${toProbe.length}`);
  }
}
await Promise.all(Array.from({ length: POOL }, worker));

await writeFile(cachePath, JSON.stringify(cache, null, 1));
const vals = Object.values(cache);
const rec = vals.filter((v) => v.recoverable).length;
console.log(`→ ${cachePath}`);
console.log(`  ${vals.length} probed · ${rec} recoverable · ${vals.length - rec} tombstone`);
