// Single-file profile cache. Backed by data/profiles.json so the whole catalog
// loads with one read and ships as one artifact at deploy. In-memory map for
// fast lookups.
//
// Why single file: per-domain files were fine at 34 entries but at 1,000+ they
// blow up the git diff, the deploy bundle, and the request-time I/O on
// readAllProfiles. One JSON file at ~7-10MB is comfortable for Vercel.
//
// Production note: Vercel serverless filesystem is read-only outside /tmp, so
// runtime writes only update the in-memory map for the lifetime of that
// instance. Persistence beyond an instance requires a real database (Vercel KV
// or Postgres - slotted for a follow-up).

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Profile } from "./types";

const PROFILES_PATH = path.join(process.cwd(), "data", "profiles.json");
const isReadOnly = process.env.VERCEL === "1";

let mem: Map<string, Profile> | null = null;
let memReady: Promise<void> | null = null;

async function ensureLoaded(): Promise<void> {
  if (mem) return;
  if (memReady) return memReady;
  memReady = (async () => {
    try {
      const raw = await fs.readFile(PROFILES_PATH, "utf-8");
      const arr = JSON.parse(raw) as Profile[];
      mem = new Map(arr.map((p) => [p.domain.toLowerCase(), p]));
    } catch {
      mem = new Map();
    }
  })();
  await memReady;
}

async function persist(): Promise<void> {
  if (isReadOnly || !mem) return;
  await fs.mkdir(path.dirname(PROFILES_PATH), { recursive: true });
  const arr = [...mem.values()];
  await fs.writeFile(PROFILES_PATH, JSON.stringify(arr, null, 2), "utf-8");
}

export async function readProfile(domain: string): Promise<Profile | null> {
  await ensureLoaded();
  return mem!.get(domain.toLowerCase()) ?? null;
}

export async function writeProfile(profile: Profile): Promise<void> {
  await ensureLoaded();
  mem!.set(profile.domain.toLowerCase(), profile);
  await persist();
}

export async function readAllProfiles(): Promise<Profile[]> {
  await ensureLoaded();
  return [...mem!.values()];
}
