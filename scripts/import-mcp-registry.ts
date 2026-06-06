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

// Domains that are HOSTING PLATFORMS, not publishers. We never credit these
// for MCP registry presence just because something happens to be hosted on
// them - that would be like crediting Heroku for every app deployed to it.
// If the platform itself ships an MCP server (e.g., github.com/github/X under
// the `github` org), the namespace check below catches that explicitly.
const HOSTING_PLATFORMS = new Set([
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "vercel.app",
  "netlify.app",
  "pages.dev",
  "fly.dev",
  "ngrok.io",
  "ngrok-free.app",
  "amazonaws.com",
  "execute-api.us-east-1.amazonaws.com",
  "execute-api.us-west-2.amazonaws.com",
  "azurewebsites.net",
  "render.com",
  "railway.app",
  "replit.app",
  "replit.dev",
  "glitch.me",
  "deno.dev",
  "workers.dev",
  "cloudflareaccess.com",
  "supabase.co", // hosting; supabase.com is the publisher
]);

function extractDomainCandidates(entry: ServerEntry): string[] {
  const cands: string[] = [];
  const name = entry.server.name ?? "";
  // server.name uses reverse-DNS namespacing. For real publishers it looks
  // like "com.stripe.mcp" or "io.something.actualcompany". For code hosted
  // on a platform it looks like "io.github.modelcontextprotocol/everything",
  // where `github` is the hosting platform, not the publisher.
  //
  // We extract the candidate publisher by forward-reading the namespace
  // (stripping the TLD prefix). For `io.github.modelcontextprotocol`, this
  // gives us "modelcontextprotocol" as the publisher org, not github.com.
  const firstSlash = name.indexOf("/");
  const ns = firstSlash > 0 ? name.slice(0, firstSlash) : name;
  if (ns.includes(".")) {
    const parts = ns.split(".");
    // Reverse-DNS pattern: first segment is TLD, rest is the domain
    // (e.g., "com.stripe" -> "stripe.com"; "io.github.foo" -> "foo.github.io"
    // which is wrong; "io.github.foo" actually means the publisher is `foo`
    // hosted on github.io, so we don't credit ANY domain from a `io.github.`
    // namespace - it's a hosting platform signal, not a publisher signal).
    if (parts[0] === "io" && parts[1] === "github") {
      // Skip - hosting platform, not publisher info
    } else if (parts.length >= 2) {
      // Reverse it to make a real domain: ["com","stripe"] -> "stripe.com"
      const reversed = [...parts].reverse().join(".");
      cands.push(reversed);
    }
  }
  // websiteUrl is the strongest publisher signal when present.
  if (entry.server.websiteUrl) {
    const h = hostOf(entry.server.websiteUrl);
    if (h && !HOSTING_PLATFORMS.has(h)) cands.push(h);
  }
  // Repository URL almost always points to github.com et al - skip unless
  // the repo IS the publisher's own domain (rare).
  if (entry.server.repository?.url) {
    const h = hostOf(entry.server.repository.url);
    if (h && !HOSTING_PLATFORMS.has(h)) cands.push(h);
  }
  // Remote URLs are where the MCP server actually runs. Often a hosting
  // platform subdomain (vercel.app, ngrok, etc.) - filter those out.
  for (const r of entry.server.remotes ?? []) {
    if (!r.url) continue;
    const h = hostOf(r.url);
    if (!h) continue;
    if (HOSTING_PLATFORMS.has(h)) continue;
    // Also skip platform subdomains like "foo.vercel.app", "foo.ngrok.io".
    const isPlatformSubdomain = [...HOSTING_PLATFORMS].some(
      (p) => h.endsWith("." + p),
    );
    if (isPlatformSubdomain) continue;
    cands.push(h);
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
