// Trivial file-backed cache for MVP. Profiles live in data/cache/{domain}.json.
// Swap for Vercel KV / Postgres when we need monitoring / history / concurrency.
//
// Production-safe note: Vercel serverless functions have a read-only filesystem
// except /tmp. On Vercel we fall through to in-memory only. Local dev writes to
// data/cache/ so seed scans are reproducible.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Profile } from "./types";

const CACHE_DIR = path.join(process.cwd(), "data", "cache");
const inMem = new Map<string, Profile>();

const isReadOnly = process.env.VERCEL === "1";

export async function readProfile(domain: string): Promise<Profile | null> {
  const key = domain.toLowerCase();
  if (inMem.has(key)) return inMem.get(key)!;
  if (isReadOnly) return null;
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, `${key}.json`), "utf-8");
    const p = JSON.parse(raw) as Profile;
    inMem.set(key, p);
    return p;
  } catch {
    return null;
  }
}

export async function writeProfile(profile: Profile): Promise<void> {
  const key = profile.domain.toLowerCase();
  inMem.set(key, profile);
  if (isReadOnly) return;
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(
    path.join(CACHE_DIR, `${key}.json`),
    JSON.stringify(profile, null, 2),
    "utf-8",
  );
}

export async function readAllProfiles(): Promise<Profile[]> {
  if (isReadOnly) return [...inMem.values()];
  try {
    const entries = await fs.readdir(CACHE_DIR);
    const out: Profile[] = [];
    for (const f of entries) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(CACHE_DIR, f), "utf-8");
        out.push(JSON.parse(raw) as Profile);
      } catch {
        // ignore corrupt cache entries
      }
    }
    return out;
  } catch {
    return [...inMem.values()];
  }
}
