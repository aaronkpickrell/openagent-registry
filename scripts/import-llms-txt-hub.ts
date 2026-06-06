// Pull the llms-txt-hub registry (the largest open directory of sites publishing
// llms.txt) and convert each entry into our seed shape. Output is written to
// data/imports/llms-txt-hub.json so the provenance is preserved.
//
// Run: pnpm tsx scripts/import-llms-txt-hub.ts

import { promises as fs } from "node:fs";
import path from "node:path";
import { hostOf, mapUpstreamCategory } from "../lib/upstream";
import type { CategorySlug, SeedEntry } from "../lib/types";

const SOURCE_URL =
  "https://raw.githubusercontent.com/thedaviddias/llms-txt-hub/main/data/websites.json";

interface HubEntry {
  name: string;
  domain: string;
  description?: string;
  llmsTxtUrl?: string;
  category?: string;
  publishedAt?: string;
}

interface ImportedEntry extends SeedEntry {
  source: "llms-txt-hub";
  upstream_category: string;
  upstream_url: string;
  imported_at: string;
}

async function main() {
  console.log(`Fetching ${SOURCE_URL}...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Upstream returned ${res.status}`);
  }
  const raw = (await res.json()) as HubEntry[];
  console.log(`Got ${raw.length} entries from upstream.`);

  const seen = new Set<string>();
  const out: ImportedEntry[] = [];
  let skipped = 0;
  let perCategory: Record<string, number> = {};

  for (const entry of raw) {
    const domain = hostOf(entry.domain);
    if (!domain) {
      skipped++;
      continue;
    }
    if (seen.has(domain)) {
      skipped++;
      continue;
    }
    seen.add(domain);
    const category: CategorySlug = mapUpstreamCategory(entry.category);
    perCategory[category] = (perCategory[category] ?? 0) + 1;
    out.push({
      domain,
      name: entry.name?.trim() || domain,
      category,
      homepage: entry.domain,
      notes: entry.description?.trim() || undefined,
      source: "llms-txt-hub",
      upstream_category: entry.category ?? "uncategorized",
      upstream_url: SOURCE_URL,
      imported_at: new Date().toISOString(),
    });
  }

  const outPath = path.join(process.cwd(), "data", "imports", "llms-txt-hub.json");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf-8");
  console.log(`\nWrote ${out.length} entries to ${outPath}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`\nPer category:`);
  for (const [cat, n] of Object.entries(perCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(12)}  ${n}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
