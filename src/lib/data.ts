// Build-time access to the normalized dataset (data/normalized/, produced by
// the ETL). Loaded once per build; nothing here ships to the client. Each file
// is validated against its Zod schema on load, so a malformed dataset fails the
// build here with a clear error rather than surfacing as a runtime bug.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ZodType } from "zod";
import {
  EventsSchema,
  TopicsSchema,
  SessionsSchema,
  ResourcesSchema,
  AggregatesSchema,
} from "./schema.js";
import type {
  Events,
  Topics,
  Sessions,
  Resources,
  Aggregates,
  EventRecord,
  Session,
  Resource,
  Topic,
} from "./types.js";

const root = join(process.cwd(), "data", "normalized");
const load = <T>(name: string, schema: ZodType<T>): T =>
  schema.parse(JSON.parse(readFileSync(join(root, name), "utf8")));

export const events: Events = load("events.json", EventsSchema);
export const topics: Topics = load("topics.json", TopicsSchema);
export const sessions: Sessions = load("sessions.json", SessionsSchema);
export const resources: Resources = load("resources.json", ResourcesSchema);
export const aggregates: Aggregates = load("aggregates.json", AggregatesSchema);

export const sessionById = new Map<string, Session>(
  sessions.map((s) => [s.id, s])
);
export const resourceById = new Map<number, Resource>(
  resources.map((r) => [r.id, r])
);
export const years: number[] = events
  .map((e: EventRecord) => e.year)
  .sort((a, b) => a - b);

export const topicSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const topicBySlug = new Map<string, Topic>(
  topics.map((t) => [topicSlug(t.title), t])
);

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Deep link into the session video at an exact moment on developer.apple.com.
export const timeLink = (
  session: Pick<Session, "webPermalink">,
  seconds: number | null | undefined
): string | null =>
  seconds ? `${session.webPermalink}?time=${seconds}` : session.webPermalink;
