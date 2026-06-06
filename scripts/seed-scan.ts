// Scan every known domain (seed + upstream imports) and write profiles.
// Loads from data/seed.json + data/imports/*.json, dedupes by domain
// (seed wins), tags each scan with its upstream-membership flags, and
// writes to data/profiles.json via lib/cache.
//
// Use LIMIT env var to cap the scan size during development:
//   LIMIT=200 pnpm seed:scan
//
// Concurrency defaults to 8. Bump with CONCURRENCY=16.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fetchAll } from "../lib/fetchers";
import { writeProfile } from "../lib/cache";
import { buildProfile } from "../lib/scorer";
import type { CategorySlug, SeedEntry } from "../lib/types";

const CONCURRENCY = Number(process.env.CONCURRENCY ?? 8);
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;

interface ImportedSeed extends SeedEntry {
  source?: string;
}

async function loadSeed(): Promise<SeedEntry[]> {
  const seedPath = path.join(process.cwd(), "data", "seed.json");
  const raw = await fs.readFile(seedPath, "utf-8");
  return JSON.parse(raw) as SeedEntry[];
}

async function loadImports(): Promise<ImportedSeed[]> {
  const dir = path.join(process.cwd(), "data", "imports");
  try {
    const files = await fs.readdir(dir);
    const out: ImportedSeed[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(dir, f), "utf-8");
      const arr = JSON.parse(raw) as ImportedSeed[];
      out.push(...arr);
    }
    return out;
  } catch {
    return [];
  }
}

function buildWorkList(seed: SeedEntry[], imports: ImportedSeed[]) {
  const llmsTxtHubDomains = new Set<string>();
  for (const i of imports) {
    if (i.source === "llms-txt-hub") {
      llmsTxtHubDomains.add(i.domain);
    }
  }

  // Dedupe: seed entries take precedence over imports for category + name.
  const byDomain = new Map<string, ImportedSeed>();
  for (const i of imports) byDomain.set(i.domain, i);
  for (const s of seed) byDomain.set(s.domain, { ...s });

  const list = [...byDomain.values()];
  return { list, llmsTxtHubDomains };
}

async function scanOne(entry: ImportedSeed, llmsTxtHubDomains: Set<string>) {
  const start = Date.now();
  try {
    const raw = await fetchAll(entry.domain);
    const profile = buildProfile({
      domain: entry.domain,
      raw,
      name: entry.name,
      category: entry.category as CategorySlug,
      ctx: { inLlmsTxtHub: llmsTxtHubDomains.has(entry.domain) },
    });
    await writeProfile(profile);
    const label = profile.label.padEnd(14);
    const score = profile.score.toString().padStart(4);
    const dur = `${Date.now() - start}ms`.padStart(7);
    console.log(`  ${score}  ${label}  ${dur}  ${entry.domain}`);
    return profile;
  } catch (err) {
    console.error(`  FAIL  ${entry.domain}:`, err);
    return null;
  }
}

async function main() {
  const seed = await loadSeed();
  const imports = await loadImports();
  const { list, llmsTxtHubDomains } = buildWorkList(seed, imports);

  const capped = isFinite(LIMIT) ? list.slice(0, LIMIT) : list;
  console.log(
    `Scanning ${capped.length} domains (seed=${seed.length}, imports=${imports.length}, llms-txt-hub members=${llmsTxtHubDomains.size}) with concurrency=${CONCURRENCY}\n`,
  );

  let cursor = 0;
  let done = 0;
  const startedAt = Date.now();
  const tick = setInterval(() => {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
    process.stderr.write(`[${elapsed}s elapsed · ${done}/${capped.length}]\r`);
  }, 5000);

  const workers = Array.from({ length: CONCURRENCY }).map(async () => {
    while (cursor < capped.length) {
      const i = cursor++;
      await scanOne(capped[i], llmsTxtHubDomains);
      done++;
    }
  });
  await Promise.all(workers);
  clearInterval(tick);

  const total = Math.round((Date.now() - startedAt) / 1000);
  console.log(`\nDone. ${done} scans in ${total}s (~${(total / done).toFixed(1)}s/scan).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
