// Compact machine-readable session index for agents and researchers.
import { sessions, aggregates } from "../../lib/data.js";

export function GET() {
  const body = {
    snapshotId: aggregates.snapshotId,
    snapshotUpdated: aggregates.snapshotUpdated,
    note: "All content © Apple Inc., linked at developer.apple.com. Session pages: https://dunfeyhotel.com/sessions/{id}/",
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      year: s.year,
      topics: s.topics,
      durationSeconds: s.duration,
      codeSnippets: s.codeSnippets.length,
      resourceIds: s.resourceIds,
      transcriptLanguages: Object.keys(s.transcripts),
      youtubeId: s.youtubeId,
      apple: s.webPermalink,
    })),
  };
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
