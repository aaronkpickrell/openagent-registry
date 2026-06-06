// Pull the full Model Context Protocol official registry catalog from
// registry.modelcontextprotocol.io and extract the set of company domains
// that publish MCP servers. Companies in this set get the +25 in_mcp_registry
// credit - having a real, callable agent surface is the strongest signal we
// know how to verify.
//
// Output: data/imports/mcp-registry-domains.json (a sorted array of domains)
//
// pnpm tsx scripts/import-mcp-registry.ts

import { promises as fs } from "node:fs";
import path from "node:path";
import { hostOf } from "../lib/upstream";

const API = "https://registry.modelcontextprotocol.io/v0/servers?limit=100";

interface ServerEntry {
  server: {
    name?: string;
    title?: string;
    description?: string;
    repository?: { url?: string };
    remotes?: Array<{ url?: string }>;
    websiteUrl?: string;
  };
  _meta?: Record<string, unknown>;
}

interface ApiResponse {
  servers: ServerEntry[];
  metadata?: { nextCursor?: string };
}

function extractDomainCandidates(entry: ServerEntry): string[] {
  const cands: string[] = [];
  const name = entry.server.name ?? "";
  // server.name often looks like "ac.inference.sh/mcp" or "io.github.modelcontextprotocol/everything"
  // The first segment up to / is a reverse-DNS-ish or domain-ish identifier.
  // Treat "io.github.X" → "github.com" (the company is on github). Reverse-DNS
  // "ac.inference.sh/mcp" → "inference.sh".
  const firstSlash = name.indexOf("/");
  const ns = firstSlash > 0 ? name.slice(0, firstSlash) : name;
  if (ns.startsWith("io.github.")) {
    cands.push("github.com");
  } else if (ns.includes(".")) {
    // Reverse the segments to get a domain-ish guess: "ac.inference.sh" → "inference.sh.ac"
    // But more often the registry uses forward order ("inference.sh") with a tld first.
    // Try both readings.
    cands.push(ns);
    const reversed = ns.split(".").reverse().join(".");
    cands.push(reversed);
  }
  if (entry.server.websiteUrl) {
    const h = hostOf(entry.server.websiteUrl);
    if (h) cands.push(h);
  }
  if (entry.server.repository?.url) {
    const h = hostOf(entry.server.repository.url);
    if (h) cands.push(h);
  }
  for (const r of entry.server.remotes ?? []) {
    if (!r.url) continue;
    const h = hostOf(r.url);
    if (h) cands.push(h);
  }
  return cands;
}

async function main() {
  const domains = new Set<string>();
  let cursor: string | undefined = undefined;
  let pages = 0;
  let totalServers = 0;
  const allCandidates: Map<string, number> = new Map();

  while (true) {
    const url = cursor ? `${API}&cursor=${encodeURIComponent(cursor)}` : API;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`MCP registry returned ${res.status} at page ${pages}`);
    }
    const data = (await res.json()) as ApiResponse;
    pages++;
    totalServers += data.servers.length;

    for (const entry of data.servers) {
      const cands = extractDomainCandidates(entry);
      for (const c of cands) {
        allCandidates.set(c, (allCandidates.get(c) ?? 0) + 1);
      }
    }

    cursor = data.metadata?.nextCursor;
    if (!cursor) break;
    if (pages > 200) {
      console.warn("hit page limit, bailing");
      break;
    }
  }

  // Heuristic: a candidate is a real company domain if it (a) has a known TLD,
  // (b) doesn't look reversed, and (c) has at least 2 occurrences OR matches a
  // recognizable host. Filter aggressively - we'd rather under-credit than
  // false-credit.
  const KNOWN_TLDS = new Set([
    "com", "org", "io", "ai", "dev", "co", "net", "app", "xyz",
    "tech", "cloud", "sh", "to", "me", "info", "tools", "tv", "us",
  ]);
  for (const cand of allCandidates.keys()) {
    const parts = cand.split(".");
    if (parts.length < 2) continue;
    const tld = parts[parts.length - 1];
    if (!KNOWN_TLDS.has(tld)) continue;
    // Skip obviously reversed identifiers ("ai.something.something" with no real tld).
    domains.add(cand.toLowerCase());
  }

  const sorted = [...domains].sort();
  const outPath = path.join(process.cwd(), "data", "imports", "mcp-registry-domains.json");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(sorted, null, 2), "utf-8");
  console.log(`Pages: ${pages}, servers: ${totalServers}`);
  console.log(`Unique candidate domains: ${allCandidates.size}`);
  console.log(`Filtered domains with known TLD: ${sorted.length}`);
  console.log(`Wrote ${outPath}`);
  console.log(`\nSample (first 20):`);
  for (const d of sorted.slice(0, 20)) console.log(`  ${d}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
