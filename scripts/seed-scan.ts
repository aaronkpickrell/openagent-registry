// Scan every seed domain in parallel and write the resulting profile to data/cache/.
// Run with: pnpm seed:scan
//
// Domains that don't resolve or 503 are still persisted with an empty/low profile —
// the page shows them honestly.

import seed from "../data/seed.json";
import { fetchAll } from "../lib/fetchers";
import { writeProfile } from "../lib/cache";
import { buildProfile } from "../lib/scorer";
import type { CategorySlug, SeedEntry } from "../lib/types";

const CONCURRENCY = 2;

async function scanOne(entry: SeedEntry) {
  const start = Date.now();
  try {
    const raw = await fetchAll(entry.domain);
    const profile = buildProfile({
      domain: entry.domain,
      raw,
      name: entry.name,
      category: entry.category as CategorySlug,
    });
    await writeProfile(profile);
    console.log(
      `  ${profile.score.toString().padStart(4)}  ${profile.label.padEnd(16)} ${entry.domain}  (${Date.now() - start}ms)`,
    );
    return profile;
  } catch (err) {
    console.error(`  FAIL  ${entry.domain}:`, err);
    return null;
  }
}

async function main() {
  const all = seed as SeedEntry[];
  console.log(`Scanning ${all.length} seed domains with concurrency=${CONCURRENCY}...\n`);
  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }).map(async () => {
    while (cursor < all.length) {
      const i = cursor++;
      await scanOne(all[i]);
    }
  });
  await Promise.all(workers);
  console.log(`\nDone. Profiles written to data/cache/.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
