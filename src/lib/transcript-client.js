// Browser-side transcript handling, shared by /transcripts/ and session pages.
// Fetches Apple's transcript JSON (CORS-open) and converts in the browser —
// nothing is rehosted. Cue ends at the next cue's start (the app hardcoded +2s).

export const LANG_NAMES = {
  eng: "English",
  jpn: "日本語",
  kor: "한국어",
  zho: "中文",
  fra: "Français",
  spa: "Español",
  por: "Português",
};

// seg is the "{lang}_{hash}" path segment from the manifest.
export const transcriptUrl = (sessionId, seg) => {
  const event = sessionId.split("-")[0];
  const lang = seg.slice(0, 3);
  return `https://devimages-cdn.apple.com/wwdc-services/transcripts/individual/${event}/${sessionId}/${seg}/${sessionId}-transcript-${lang}.json`;
};

const pad = (n, w = 2) => String(n).padStart(w, "0");
const stamp = (sec) =>
  `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(Math.floor(sec % 60))},${pad(Math.round((sec % 1) * 1000), 3)}`;

const entriesOf = (json) => Object.values(json)[0]?.transcript ?? [];

export const toSRT = (json) => {
  const entries = entriesOf(json);
  return entries
    .map(([time, text], i) => {
      const end = i + 1 < entries.length ? entries[i + 1][0] : time + 4;
      return `${i + 1}\n${stamp(time)} --> ${stamp(end)}\n${String(text).trim()}\n`;
    })
    .join("\n");
};

export const toTXT = (json) =>
  entriesOf(json)
    .map(([, text]) => String(text))
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export async function downloadTranscript(sessionId, seg, kind, button) {
  const url = transcriptUrl(sessionId, seg);
  if (button) button.disabled = true;
  try {
    const json = await fetch(url).then((r) => r.json());
    const content = kind === "srt" ? toSRT(json) : toTXT(json);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${sessionId}-${seg.slice(0, 3)}.${kind}`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    open(url, "_blank");
  } finally {
    if (button) button.disabled = false;
  }
}
