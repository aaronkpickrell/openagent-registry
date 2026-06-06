import { NextResponse } from "next/server";
import seed from "@/data/seed.json";
import { normalizeDomain } from "@/lib/domain";
import { fetchAll } from "@/lib/fetchers";
import { buildProfile } from "@/lib/scorer";
import { readProfile, writeProfile } from "@/lib/cache";
import type { CategorySlug, SeedEntry } from "@/lib/types";

const SEED = seed as SeedEntry[];
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ScanQuery {
  domain: string | null;
  fresh: boolean;
}

function parseQuery(url: URL): ScanQuery {
  return {
    domain: normalizeDomain(url.searchParams.get("domain") ?? ""),
    fresh: url.searchParams.get("fresh") === "1",
  };
}

async function performScan(domain: string) {
  const seedEntry = SEED.find((s) => s.domain === domain);
  const raw = await fetchAll(domain);
  return buildProfile({
    domain,
    raw,
    name: seedEntry?.name,
    category: seedEntry?.category as CategorySlug | undefined,
    // Future: pass ctx with upstream-registry membership lookups here.
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { domain, fresh } = parseQuery(url);
  if (!domain) {
    return NextResponse.json(
      { error: "Provide ?domain=example.com (valid hostname required)." },
      { status: 400 },
    );
  }

  if (!fresh) {
    const cached = await readProfile(domain);
    if (cached) {
      const age = Date.now() - new Date(cached.scanned_at).getTime();
      if (age < CACHE_TTL_MS) {
        return NextResponse.json({ ...cached, cached: true, age_ms: age });
      }
    }
  }

  const profile = await performScan(domain);
  await writeProfile(profile);
  return NextResponse.json({ ...profile, cached: false });
}

export async function POST(request: Request) {
  return GET(request);
}
