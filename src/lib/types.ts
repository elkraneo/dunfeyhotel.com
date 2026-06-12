// TypeScript types for the normalized dataset, inferred from the Zod schemas
// in ./schema.js so the types and the runtime validation can never drift.
//
// Top-level dataset types (the full JSON file) carry a `*Dataset` name; the
// element/record types reuse the natural domain names (Session, Resource, …).
import type { z } from "zod";
import type {
  EventSchema,
  EventsSchema,
  TopicSchema,
  TopicsSchema,
  ChapterSchema,
  CodeSnippetSchema,
  SessionSchema,
  SessionsSchema,
  ResourceSchema,
  ResourcesSchema,
  YearStatsSchema,
  AggregatesSchema,
  SessionCellSchema,
  ResourceCellSchema,
  ExplorerSchema,
  ObservatorySessionSchema,
  ObservatoryResourceSchema,
  ObservatoryIndexSchema,
  LostItemSchema,
  LostAndFoundSchema,
} from "./schema.js";

// --- events ---
export type EventRecord = z.infer<typeof EventSchema>;
export type Events = z.infer<typeof EventsSchema>;

// --- topics ---
export type Topic = z.infer<typeof TopicSchema>;
export type Topics = z.infer<typeof TopicsSchema>;

// --- sessions ---
export type Chapter = z.infer<typeof ChapterSchema>;
export type CodeSnippet = z.infer<typeof CodeSnippetSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Sessions = z.infer<typeof SessionsSchema>;

// --- resources ---
export type Resource = z.infer<typeof ResourceSchema>;
export type Resources = z.infer<typeof ResourcesSchema>;

// --- aggregates ---
export type YearStats = z.infer<typeof YearStatsSchema>;
export type Aggregates = z.infer<typeof AggregatesSchema>;

// --- explorer ---
export type SessionCell = z.infer<typeof SessionCellSchema>;
export type ResourceCell = z.infer<typeof ResourceCellSchema>;
export type Explorer = z.infer<typeof ExplorerSchema>;

// --- observatory index ---
export type ObservatorySession = z.infer<typeof ObservatorySessionSchema>;
export type ObservatoryResource = z.infer<typeof ObservatoryResourceSchema>;
export type ObservatoryIndex = z.infer<typeof ObservatoryIndexSchema>;

// --- lost & found ---
export type LostItem = z.infer<typeof LostItemSchema>;
export type LostAndFound = z.infer<typeof LostAndFoundSchema>;
