# dunfeyhotel.com

Explore WWDC as data: every session since WWDC14 — categories, durations, code
snippets, transcripts, resources — cross-linked and searchable, with trends
across years.

Named after the Dunfey Hotel in San Mateo, where Apple held the first Worldwide
Developers Conference.

## Principles

- **Link, don't host.** Videos, transcripts, sample code, and documentation all
  link to `developer.apple.com`. This site publishes metadata, aggregates, and
  deep links (`?time=` permalinks into sessions) — facts, not Apple's content.
- **Static, pre-baked.** All queries are computed at build time or run
  client-side over a compact dataset. No server, no runtime backend.
- **Honest history.** Apple rewrites its catalog between snapshots. The ETL
  archives every dated snapshot, and seasonal API environments (which stay
  online, frozen) allow period-accurate recovery.

## Layout

- `etl/endpoints.json` — registry of Apple `wwdc-services` environment tokens
  per era, with the discovery method documented.
- `etl/fetch.mjs` — fetches current feeds, archives a dated raw snapshot under
  `data/raw/snapshot-<id>-<date>/`.
- `etl/normalize.mjs` — emits `data/normalized/`: sessions (with code
  snippets, related-session graph, keywords, resource links), events, topics,
  resources, and pre-baked aggregates (topic × year, durations).
- `data/` — gitignored. Fetched from Apple's CDN at build time.

## Usage

```sh
node etl/fetch.mjs       # archive the current snapshot
node etl/normalize.mjs   # build data/normalized/ from the latest snapshot
```

## Status

Data layer working: 1,369 talks (2014–2026), 6,876 timestamped code snippets,
2,078 cross-linked resources, transcript availability for 1,361 talks.
Astro site: not yet scaffolded.
