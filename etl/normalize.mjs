#!/usr/bin/env node
// Normalize the latest raw snapshot into the website dataset.
// Usage: node normalize.mjs [--snapshot <dirname>]   (defaults to highest snapshotId in data/raw)
//
// Output: data/normalized/
//   events.json     — WWDC events with dates
//   topics.json     — topic id → title/symbol
//   sessions.json   — talks (Video|Session) with duration, topics, keywords,
//                     related ids, code snippets (plain text + video timestamps),
//                     transcript availability, and Apple permalinks (we host nothing)
//   resources.json  — sample code / docs / downloads, with referencing sessions
//   aggregates.json — pre-baked stats: per-year counts, topic × year matrix, durations

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const rawRoot = join(here, "..", "data", "raw");
const outDir = join(here, "..", "data", "normalized");

const snapArg = process.argv.indexOf("--snapshot");
let snapName;
if (snapArg !== -1) {
  snapName = process.argv[snapArg + 1];
} else {
  // Latest = highest numeric snapshotId. Legacy/non-numeric snapshots (the
  // old videos.json API) are archive-only and never the build source.
  const dirs = (await readdir(rawRoot))
    .filter((d) => d.startsWith("snapshot-") && Number.isFinite(Number(d.split("-")[1])));
  snapName = dirs.sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1])).at(-1);
}
if (!snapName) throw new Error("No raw snapshot found. Run fetch.mjs first.");
const snapDir = join(rawRoot, snapName);

const contents = JSON.parse(await readFile(join(snapDir, "contents.json"), "utf8"));

// Transcript manifests, one per language Apple publishes.
const LANGS = ["eng", "jpn", "kor", "zho", "fra", "spa", "por"];
const transcriptsByLang = new Map();
for (const lang of LANGS) {
  try {
    const m = JSON.parse(
      await readFile(join(snapDir, `transcript-manifest-${lang}.json`), "utf8")
    );
    transcriptsByLang.set(
      lang,
      new Map(Object.entries(m.individual ?? {}).map(([id, v]) => [id, v.url ?? null]))
    );
  } catch {}
}

// Apple's official YouTube uploads (built by etl/youtube.mjs, committed).
let youtubeMap = {};
try {
  youtubeMap = JSON.parse(await readFile(join(here, "youtube-map.json"), "utf8"));
} catch {}


// Typographic apostrophes for prose fields (never applied to code).
const typo = (v) => (typeof v === "string" ? v.replace(/'/g, "’") : v);

const stripHTML = (html) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

const TALK_TYPES = new Set(["Video", "Session"]);
const wwdcEvents = contents.events.filter((e) => e.id.startsWith("wwdc"));

const events = wwdcEvents.map((e) => ({
  id: e.id,
  name: e.name,
  year: Number(e.id.slice(4)),
  startTime: e.startTime,
  endTime: e.endTime,
}));

const topics = contents.topics.map((t) => ({
  id: t.id,
  title: t.title,
  sfSymbolName: t.sfSymbolName ?? null,
  glyph: t.svgURL ?? null,
}));
const topicTitle = new Map(topics.map((t) => [t.id, t.title]));

// Session artwork lives on Apple's CDN under the EVENT's imagesPath:
// {imagesPath}/{staticContentId}/{staticContentId}_wide_{w}x{h}_2x.jpg
const eventImagesPath = new Map(
  contents.events.map((e) => [e.id, e.imagesPath ?? null])
);
const artwork = (c, size) => {
  const base = eventImagesPath.get(c.eventId);
  return base && c.staticContentId
    ? `${base}/${c.staticContentId}/${c.staticContentId}_wide_${size}_2x.jpg`
    : null;
};

const sessions = contents.contents
  .filter((c) => c.eventId.startsWith("wwdc") && TALK_TYPES.has(c.type))
  .map((c) => ({
    id: c.id,
    eventId: c.eventId,
    year: Number(c.eventId.slice(4)),
    title: typo(c.title),
    description: typo(c.description ?? null),
    type: c.type,
    duration: c.media?.duration ?? null,
    primaryTopicId: c.primaryTopicID ?? null,
    topicIds: c.topicIds ?? [],
    topics: (c.topicIds ?? []).map((id) => topicTitle.get(id)).filter(Boolean),
    keywords: c.keywords ?? [],
    related: c.related?.activities ?? [],
    resourceIds: c.related?.resources ?? [],
    platforms: c.platforms ?? [],
    webPermalink: c.webPermalink ?? null,
    thumb: artwork(c, "250x141"),
    ogImage: artwork(c, "900x506"),
    hasTranscript: [...transcriptsByLang.values()].some((m) => m.has(c.id)),
    // {lang: url} for every language with a transcript of this session.
    transcripts: Object.fromEntries(
      [...transcriptsByLang.entries()]
        .filter(([, m]) => m.get(c.id))
        .map(([lang, m]) => [lang, m.get(c.id)])
    ),
    youtubeId: youtubeMap[c.id] ?? null,
    chapters: c.media?.chapters ?? [],
    codeSnippets: (c.codeSnippets ?? []).map((s) => ({
      title: s.title,
      language: s.language ?? null,
      startTimeSeconds: s.startTimeSeconds ?? null,
      endTimeSeconds: s.endTimeSeconds ?? null,
      code: stripHTML(s.code ?? ""),
      // Apple ships the snippet pre-highlighted (span.syntax-*); keep it for display.
      html: s.code ?? "",
    })),
  }));

const sessionsByResource = new Map();
for (const c of contents.contents) {
  for (const rid of c.related?.resources ?? []) {
    if (!sessionsByResource.has(rid)) sessionsByResource.set(rid, []);
    sessionsByResource.get(rid).push(c.id);
  }
}
const resources = (contents.resources ?? []).map((r) => ({
  id: r.id,
  type: r.resource_type ?? r.resourceType ?? null,
  title: typo(r.title ?? null),
  description: typo(r.description ?? null),
  url: r.url ?? null,
  sessionIds: sessionsByResource.get(r.id) ?? [],
}));

// Apple removes sessions and resources from the catalog over time. Recover
// them from older archived snapshots and mark them delisted — the archive is
// the only place this history survives. Recoverability comes from the probe
// cache (etl/probe-delisted.mjs, refreshed out of band): a still-200 Apple URL
// is a link Apple's own site no longer surfaces; a 404 is a tombstone.
const knownResourceIds = new Set(resources.map((r) => r.id));
const currentSessionIds = new Set(sessions.map((s) => s.id));
const currentEventIds = new Set(events.map((e) => e.id));
const seenLostSessions = new Set();
const lostFound = [];

let delistedStatus = {};
try {
  delistedStatus = JSON.parse(await readFile(join(here, "..", "data", "delisted-status.json"), "utf8"));
} catch {}
const recoverabilityOf = (url) => {
  const v = url && delistedStatus[url];
  if (!v) return { recoverable: null, status: null }; // unprobed
  return { recoverable: !!v.recoverable, status: v.status ?? null };
};

const olderSnapshots = (await readdir(rawRoot))
  .filter((d) => d.startsWith("snapshot-") && d !== snapName)
  .sort();
for (const dir of olderSnapshots) {
  let old;
  try {
    old = JSON.parse(await readFile(join(rawRoot, dir, "contents.json"), "utf8"));
  } catch {
    continue;
  }
  const lastSeen = old.updated?.slice(0, 10) ?? dir.split("-").slice(2).join("-");
  const oldSession = new Map((old.contents ?? []).map((c) => [c.id, c]));
  const oldRefs = new Map();
  for (const c of old.contents ?? []) {
    for (const rid of c.related?.resources ?? c.relatedResourceIds ?? []) {
      if (!oldRefs.has(rid)) oldRefs.set(rid, []);
      oldRefs.get(rid).push(c.id);
    }
  }

  // Delisted resources.
  for (const r of old.resources ?? []) {
    if (knownResourceIds.has(r.id)) continue;
    knownResourceIds.add(r.id);
    const refs = oldRefs.get(r.id) ?? [];
    const refSession = refs.map((id) => oldSession.get(id)).find(Boolean);
    const year = refSession ? Number(refSession.eventId.slice(4)) : null;
    const { recoverable, status } = recoverabilityOf(r.url);
    resources.push({
      id: r.id,
      type: r.resource_type ?? r.resourceType ?? null,
      title: typo(r.title ?? null),
      description: typo(r.description ?? null),
      url: r.url ?? null,
      sessionIds: refs.filter((id) => currentSessionIds.has(id)),
      delisted: true,
      lastSeen,
    });
    // developerForum entries are parameterized forum-search links Apple
    // staples to sessions, not lost content — keep them out of Lost & Found.
    const rtype = r.resource_type ?? r.resourceType ?? null;
    if (rtype !== "developerForum") {
      lostFound.push({
        id: r.id,
        kind: "resource",
        type: rtype,
        title: typo(r.title ?? null),
        url: r.url ?? null,
        year,
        primaryTopicId: refSession?.primaryTopicID ?? null,
        lastSeen,
        recoverable,
        status,
      });
    }
  }

  // Delisted sessions — real talks only (Video/Session), and only for event
  // years the current catalog still publishes, so a whole-year rolloff isn't
  // mistaken for a removal.
  for (const c of old.contents ?? []) {
    if (!TALK_TYPES.has(c.type)) continue;
    if (!currentEventIds.has(c.eventId)) continue;
    if (currentSessionIds.has(c.id) || seenLostSessions.has(c.id)) continue;
    seenLostSessions.add(c.id);
    const { recoverable, status } = recoverabilityOf(c.webPermalink);
    lostFound.push({
      id: c.id,
      kind: "session",
      type: c.type,
      title: typo(c.title ?? null),
      url: c.webPermalink ?? null,
      year: Number(c.eventId.slice(4)),
      primaryTopicId: c.primaryTopicID ?? null,
      lastSeen,
      recoverable,
      status,
    });
  }
}

// Pre-baked aggregates so the site needs no runtime queries.
const years = events.map((e) => e.year).sort((a, b) => a - b);
const byYear = {};
for (const y of years) {
  const talks = sessions.filter((s) => s.year === y);
  byYear[y] = {
    talks: talks.length,
    totalDurationSeconds: talks.reduce((sum, s) => sum + (s.duration ?? 0), 0),
    withTranscript: talks.filter((s) => s.hasTranscript).length,
    withCodeSnippets: talks.filter((s) => s.codeSnippets.length).length,
    codeSnippets: talks.reduce((sum, s) => sum + s.codeSnippets.length, 0),
  };
}
const topicYearMatrix = {};
for (const t of topics) {
  topicYearMatrix[t.title] = {};
  for (const y of years) {
    topicYearMatrix[t.title][y] = sessions.filter(
      (s) => s.year === y && s.topicIds.includes(t.id)
    ).length;
  }
}
const aggregates = {
  snapshotId: contents.snapshotId,
  snapshotUpdated: contents.updated,
  note: "Talk counts include types Video and Session only; labs, get-togethers and office hours are excluded for fair year-over-year comparison. Pre-2019 years reflect only the catalog Apple still publishes, not the full historical conference.",
  byYear,
  topicYearMatrix,
};

// Compact dataset for the client-side observatory (coordinated explorable
// views). Sessions are attributed to their primary topic to avoid double
// counting; resources to the year they were first referenced by a session.
const cells = new Map();
for (const s of sessions) {
  const key = `${s.year}:${s.primaryTopicId ?? 0}`;
  const cell = cells.get(key) ?? {
    year: s.year,
    topicId: s.primaryTopicId ?? 0,
    sessions: 0,
    seconds: 0,
    snippets: 0,
  };
  cell.sessions += 1;
  cell.seconds += s.duration ?? 0;
  cell.snippets += s.codeSnippets.length;
  cells.set(key, cell);
}

const resourceFirstYear = new Map();
for (const s of sessions) {
  for (const rid of s.resourceIds) {
    const y = resourceFirstYear.get(rid);
    if (!y || s.year < y) resourceFirstYear.set(rid, s.year);
  }
}
const resourceCells = new Map();
for (const r of resources) {
  const year = resourceFirstYear.get(r.id);
  if (!year || !r.type) continue;
  const key = `${year}:${r.type}`;
  resourceCells.set(key, (resourceCells.get(key) ?? 0) + 1);
}

const explorer = {
  snapshotId: contents.snapshotId,
  years,
  topics,
  sessionCells: [...cells.values()],
  resourceCells: [...resourceCells.entries()].map(([key, count]) => {
    const [year, type] = key.split(":");
    return { year: Number(year), type, count };
  }),
};

await mkdir(outDir, { recursive: true });
const write = (name, data) => writeFile(join(outDir, name), JSON.stringify(data, null, 1));
await write("events.json", events);
await write("topics.json", topics);
await write("sessions.json", sessions);
await write("resources.json", resources);
// Compact per-item index for the observatory's actionable cross-section:
// every session and resource, minimal fields, short keys.
const observatoryIndex = {
  sessions: sessions.map((s) => ({
    id: s.id,
    t: s.title,
    y: s.year,
    k: s.topicIds,
    p: s.primaryTopicId,
    d: s.duration ?? 0,
    c: s.codeSnippets.length,
    r: s.resourceIds,
    img: s.thumb,
    tr: s.hasTranscript ? 1 : 0,
    // lang → "{lang}_{hash}" path segment; full URL is reconstructable.
    trs: Object.fromEntries(
      Object.entries(s.transcripts).map(([lang, url]) => {
        const seg = url.split("/").at(-2);
        return [lang, seg];
      })
    ),
    u: s.webPermalink,
  })),
  resources: resources
    .filter((r) => r.type && r.title)
    .map((r) => ({ id: r.id, type: r.type, t: r.title, u: r.url })),
};

// Lost & Found: everything Apple delisted, split by whether its original URL
// still resolves. Newest-lost first; unprobed items sort last.
lostFound.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title));
const lostAndFound = {
  generated: new Date().toISOString().slice(0, 10),
  counts: {
    total: lostFound.length,
    recoverable: lostFound.filter((x) => x.recoverable === true).length,
    tombstone: lostFound.filter((x) => x.recoverable === false).length,
    unprobed: lostFound.filter((x) => x.recoverable === null).length,
    sessions: lostFound.filter((x) => x.kind === "session").length,
    resources: lostFound.filter((x) => x.kind === "resource").length,
  },
  items: lostFound,
};

await write("aggregates.json", aggregates);
await write("explorer.json", explorer);
await write("observatory-index.json", observatoryIndex);
await write("lost-and-found.json", lostAndFound);
console.log(
  `  lost & found: ${lostAndFound.counts.total} delisted (${lostAndFound.counts.recoverable} recoverable, ${lostAndFound.counts.tombstone} tombstone)`
);

console.log(`Normalized ${snapName}:`);
console.log(`  ${events.length} events, ${topics.length} topics, ${sessions.length} talks, ${resources.length} resources`);
console.log(`  talks with transcripts: ${sessions.filter((s) => s.hasTranscript).length}`);
console.log(`  talks with code snippets: ${sessions.filter((s) => s.codeSnippets.length).length} (${sessions.reduce((n, s) => n + s.codeSnippets.length, 0)} snippets)`);
console.log(`  talks with related links: ${sessions.filter((s) => s.related.length).length}`);
console.log(`→ ${outDir}`);
