// Recompute scores on every existing profile using the current WEIGHTS table
// in lib/scorer.ts. Cheap - we don't re-fetch anything, we just re-derive
// total + label from the existing signal facts. Run after the rubric changes.
//
// pnpm tsx scripts/rescore.ts

import { promises as fs } from "node:fs";
import path from "node:path";
import { labelFor, WEIGHTS } from "../lib/scorer";
import type { Profile, SignalKey } from "../lib/types";

async function main() {
  const profilesPath = path.join(process.cwd(), "data", "profiles.json");
  const raw = await fs.readFile(profilesPath, "utf-8");
  const profiles = JSON.parse(raw) as Profile[];

  let changed = 0;
  let bumped = 0;
  let dropped = 0;

  for (const p of profiles) {
    const before = p.score;
    const hasCommercial = p.signals.some(
      (s) => s.key === "licensed_commercial_access" && s.found,
    );
    const wasBlocked = p.signals.some(
      (s) =>
        s.found &&
        (s.key === "blocked_by_bot_management" ||
          s.key === "blocks_automation" ||
          s.key === "explicit_prohibition"),
    );
    let total = 0;
    for (const s of p.signals) {
      const w = WEIGHTS[s.key as SignalKey];
      if (s.found || s.points < 0) {
        // Commercial trumps block: zero out edge-block penalties when a
        // commercial licensing path is present.
        if (
          hasCommercial &&
          (s.key === "blocked_by_bot_management" ||
            s.key === "blocks_automation" ||
            s.key === "explicit_prohibition")
        ) {
          s.points = 0;
        } else {
          s.points = w ?? 0;
        }
      } else {
        s.points = 0;
      }
      total += s.points;
    }
    p.score = total;
    p.label = labelFor(total, { hasCommercial, wasBlocked });
    if (before !== total) {
      changed++;
      if (total > before) bumped++;
      else dropped++;
    }
  }

  await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2), "utf-8");
  console.log(
    `Rescored ${profiles.length} profiles. ${changed} changed (${bumped} up, ${dropped} down).\n`,
  );

  const top = [...profiles].sort((a, b) => b.score - a.score).slice(0, 15);
  console.log("New top 15:");
  for (const p of top) {
    console.log(
      `  ${p.score.toString().padStart(4)}  ${p.label.padEnd(15)}  ${(p.category ?? "?").padEnd(10)}  ${p.domain}`,
    );
  }
  console.log("");
  const sorted = [...profiles].sort((a, b) => b.score - a.score);
  console.log("Label distribution:");
  const dist: Record<string, number> = {};
  for (const p of sorted) dist[p.label] = (dist[p.label] ?? 0) + 1;
  for (const [l, n] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${l.padEnd(15)}  ${n}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
