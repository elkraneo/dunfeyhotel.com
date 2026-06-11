# dunfeyhotel.com

Explore WWDC as data: every session since WWDC14 — categories, durations, the
code shown on screen, transcripts in seven languages, resources (including
ones Apple later delisted) — cross-linked, searchable, with trends across
editions. Live at **[dunfeyhotel.com](https://dunfeyhotel.com)**.

Named after the Dunfey Hotel in San Mateo, where Apple held its first
developers conference in 1983.

## Principles

- **Link, don't host.** Videos, transcripts, sample code and documentation all
  link to `developer.apple.com` (or Apple's official YouTube uploads). This
  site publishes metadata, aggregates, excerpts and deep links — never the
  content itself. See [LICENSE](LICENSE): the code is MIT; the data is
  Apple's and is not in this repository.
- **Static, pre-baked.** Every query is computed at build time or runs
  client-side. No server, no backend, no accounts.
- **Honest history.** Apple revises its catalog between snapshots. The ETL
  archives dated snapshots and recovers delisted items, marked as such.
- **One cross-section.** Years + topics + text selected once, in the front
  desk bar, applied by every page: observatory charts, transcripts, resources,
  full-text search, even static lists. The view lives in the URL.

## Layout

- `etl/fetch.mjs` — archives a dated raw snapshot of Apple's public feed.
  Requires a feed configuration: copy `etl/endpoints.example.json` to
  `data/endpoints.json` and fill in the current environment of the Apple
  Developer app's feed.
- `etl/normalize.mjs` — emits the normalized dataset (sessions, topics,
  events, resources, aggregates, search indexes' source).
- `etl/transcripts-cache.mjs` — caches transcript text for search indexing.
- `etl/youtube.mjs` — maps sessions to Apple's official YouTube uploads
  (`etl/youtube-map.json`, committed).
- `scripts/build-search.mjs` — Pagefind index: rendered pages + transcript
  text as custom records (excerpt display only).
- `src/` — Astro 5 site. `data/` is never committed.

## Usage

```sh
npm ci
cp etl/endpoints.example.json data/endpoints.json   # then fill in the feed env
node etl/fetch.mjs
node etl/normalize.mjs
npm run build        # astro build + search index
```

## Machine-readable

`/data/sessions.json`, `/data/topics.json`, `/data/events.json`,
`/years/{year}/resources.tsv`, `/llms.txt`, `/rss.xml`.

## Not affiliated

WWDC is a trademark of Apple Inc. This project is independent and
non-commercial, for research and education. Contact: dunfeyhotel@reality2713.com
