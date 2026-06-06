// One-shot: collapse data/cache/*.json (per-domain files) into a single
// data/profiles.json. Idempotent — running it twice doesn't double-count.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Profile } from "../lib/types";

async function main() {
  const cacheDir = path.join(process.cwd(), "data", "cache");
  const outPath = path.join(process.cwd(), "data", "profiles.json");

  const existing: Profile[] = await fs
    .readFile(outPath, "utf-8")
    .then((s) => JSON.parse(s) as Profile[])
    .catch(() => []);
  const byDomain = new Map<string, Profile>(
    existing.map((p) => [p.domain.toLowerCase(), p]),
  );

  let added = 0;
  try {
    const files = await fs.readdir(cacheDir);
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(cacheDir, f), "utf-8");
      const p = JSON.parse(raw) as Profile;
      if (!byDomain.has(p.domain.toLowerCase())) {
        added++;
      }
      byDomain.set(p.domain.toLowerCase(), p);
    }
  } catch {
    console.log("(no existing data/cache/ directory; skipping per-file collapse)");
  }

  const merged = [...byDomain.values()].sort((a, b) => a.domain.localeCompare(b.domain));
  await fs.writeFile(outPath, JSON.stringify(merged, null, 2), "utf-8");
  console.log(`Wrote ${merged.length} profiles to ${outPath} (added ${added} this run).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
