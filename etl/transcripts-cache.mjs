#!/usr/bin/env node
// Cache English transcript text into data/transcripts/eng/{id}.txt — part of
// the archive (transcripts get delisted like everything else) and the source
// for full-text search indexing. Sources: the apple-vault mirror when
// mounted, Apple's CDN otherwise.

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "data", "transcripts", "eng");
const VAULT = "/Volumes/home/apple-vault/transcripts";

const sessions = JSON.parse(
  await readFile(join(here, "..", "data", "normalized", "sessions.json"), "utf8")
);
await mkdir(outDir, { recursive: true });

const want = sessions.filter((s) => s.transcripts?.eng);
let cached = 0,
  fromVault = 0,
  fetched = 0,
  failed = 0;

const textFromTuples = (json) =>
  (Object.values(json)[0]?.transcript ?? [])
    .map(([, text]) => String(text))
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

async function one(s) {
  const target = join(outDir, `${s.id}.txt`);
  try {
    await access(target);
    cached++;
    return;
  } catch {}
  try {
    const vault = JSON.parse(await readFile(join(VAULT, `${s.id}.json`), "utf8"));
    if (vault.content) {
      await writeFile(target, vault.content.trim());
      fromVault++;
      return;
    }
  } catch {}
  try {
    const json = await fetch(s.transcripts.eng).then((r) => r.json());
    await writeFile(target, textFromTuples(json));
    fetched++;
  } catch {
    failed++;
  }
}

const POOL = 8;
for (let i = 0; i < want.length; i += POOL) {
  await Promise.all(want.slice(i, i + POOL).map(one));
}
console.log(
  `${want.length} transcripts → ${cached} already cached, ${fromVault} from vault, ${fetched} fetched, ${failed} failed`
);
