// Zod schemas for the normalized dataset (data/normalized/, produced by the
// ETL). Plain ESM JS so etl/normalize.mjs can import and validate against these
// directly, and so src/lib/types.ts can infer TS types from them.
//
// Each exported schema is the FULL top-level shape of one JSON file. Shapes are
// ground-truthed against the real data and the ETL's own null-coalescing: a
// field the ETL writes as `x ?? null` is `.nullable()` here even where the
// current snapshot happens to have no nulls, because future snapshots can.
import { z } from "zod";

// --- events.json ---------------------------------------------------------
export const EventSchema = z.object({
  id: z.string(),
  name: z.string(),
  year: z.number(),
  startTime: z.string(),
  endTime: z.string(),
});
export const EventsSchema = z.array(EventSchema);

// --- topics.json ---------------------------------------------------------
export const TopicSchema = z.object({
  id: z.number(),
  title: z.string(),
  sfSymbolName: z.string().nullable(),
  glyph: z.string().nullable(),
});
export const TopicsSchema = z.array(TopicSchema);

// --- sessions.json -------------------------------------------------------
export const ChapterSchema = z.object({
  start: z.number(),
  title: z.string(),
  // Apple omits the summary on some chapters; absent in JSON.
  summary: z.string().optional(),
  end: z.number(),
});

export const CodeSnippetSchema = z.object({
  title: z.string(),
  language: z.string().nullable(),
  startTimeSeconds: z.number().nullable(),
  endTimeSeconds: z.number().nullable(),
  code: z.string(),
  html: z.string(),
});

export const SessionSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  year: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(["Video", "Session"]),
  duration: z.number().nullable(),
  primaryTopicId: z.number().nullable(),
  topicIds: z.array(z.number()),
  topics: z.array(z.string()),
  keywords: z.array(z.string()),
  related: z.array(z.string()),
  resourceIds: z.array(z.number()),
  platforms: z.array(z.string()),
  webPermalink: z.string().nullable(),
  thumb: z.string().nullable(),
  ogImage: z.string().nullable(),
  hasTranscript: z.boolean(),
  // lang code -> transcript URL
  transcripts: z.record(z.string(), z.string()),
  youtubeId: z.string().nullable(),
  chapters: z.array(ChapterSchema),
  codeSnippets: z.array(CodeSnippetSchema),
});
export const SessionsSchema = z.array(SessionSchema);

// --- resources.json ------------------------------------------------------
// Delisted resources carry two extra fields; current ones omit them.
export const ResourceSchema = z.object({
  id: z.number(),
  type: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  url: z.string().nullable(),
  sessionIds: z.array(z.string()),
  delisted: z.boolean().optional(),
  lastSeen: z.string().optional(),
});
export const ResourcesSchema = z.array(ResourceSchema);

// --- aggregates.json -----------------------------------------------------
export const YearStatsSchema = z.object({
  talks: z.number(),
  totalDurationSeconds: z.number(),
  withTranscript: z.number(),
  withCodeSnippets: z.number(),
  codeSnippets: z.number(),
});
export const AggregatesSchema = z.object({
  snapshotId: z.number(),
  snapshotUpdated: z.string(),
  note: z.string(),
  // year (as string key) -> stats
  byYear: z.record(z.string(), YearStatsSchema),
  // topic title -> { year (string key) -> count }
  topicYearMatrix: z.record(z.string(), z.record(z.string(), z.number())),
});

// --- explorer.json -------------------------------------------------------
export const SessionCellSchema = z.object({
  year: z.number(),
  topicId: z.number(),
  sessions: z.number(),
  seconds: z.number(),
  snippets: z.number(),
});
export const ResourceCellSchema = z.object({
  year: z.number(),
  type: z.string(),
  count: z.number(),
});
export const ExplorerSchema = z.object({
  snapshotId: z.number(),
  years: z.array(z.number()),
  topics: TopicsSchema,
  sessionCells: z.array(SessionCellSchema),
  resourceCells: z.array(ResourceCellSchema),
});

// --- observatory-index.json ---------------------------------------------
export const ObservatorySessionSchema = z.object({
  id: z.string(),
  t: z.string(),
  y: z.number(),
  k: z.array(z.number()),
  p: z.number().nullable(),
  d: z.number(),
  c: z.number(),
  r: z.array(z.number()),
  img: z.string().nullable(),
  tr: z.number(),
  // lang -> "{lang}_{hash}" path segment
  trs: z.record(z.string(), z.string()),
  u: z.string().nullable(),
});
export const ObservatoryResourceSchema = z.object({
  id: z.number(),
  type: z.string(),
  t: z.string(),
  u: z.string().nullable(),
});
export const ObservatoryIndexSchema = z.object({
  sessions: z.array(ObservatorySessionSchema),
  resources: z.array(ObservatoryResourceSchema),
});

// --- lost-and-found.json -------------------------------------------------
export const LostItemSchema = z.object({
  // resources carry numeric ids; sessions carry string ids.
  id: z.union([z.string(), z.number()]),
  kind: z.enum(["session", "resource"]),
  type: z.string().nullable(),
  title: z.string().nullable(),
  url: z.string().nullable(),
  year: z.number().nullable(),
  primaryTopicId: z.number().nullable(),
  lastSeen: z.string(),
  // null when the URL was never probed for recoverability.
  recoverable: z.boolean().nullable(),
  status: z.number().nullable(),
});
export const LostAndFoundSchema = z.object({
  generated: z.string(),
  counts: z.object({
    total: z.number(),
    recoverable: z.number(),
    tombstone: z.number(),
    unprobed: z.number(),
    sessions: z.number(),
    resources: z.number(),
  }),
  items: z.array(LostItemSchema),
});
