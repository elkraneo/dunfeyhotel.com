// Build-time access to the normalized dataset (data/normalized/, produced by
// the ETL). Loaded once per build; nothing here ships to the client.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "data", "normalized");
const load = (name) => JSON.parse(readFileSync(join(root, name), "utf8"));

export const events = load("events.json");
export const topics = load("topics.json");
export const sessions = load("sessions.json");
export const resources = load("resources.json");
export const aggregates = load("aggregates.json");

export const sessionById = new Map(sessions.map((s) => [s.id, s]));
export const resourceById = new Map(resources.map((r) => [r.id, r]));
export const years = events.map((e) => e.year).sort((a, b) => a - b);

export const topicSlug = (title) =>
  title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const topicBySlug = new Map(topics.map((t) => [topicSlug(t.title), t]));

export function formatDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

export function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Deep link into the session video at an exact moment on developer.apple.com.
export const timeLink = (session, seconds) =>
  seconds ? `${session.webPermalink}?time=${seconds}` : session.webPermalink;
