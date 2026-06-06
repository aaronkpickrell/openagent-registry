// Parallel fetchers for the well-known endpoints we care about.
// Each fetcher returns the raw body (string) plus the response URL it actually
// got - letting the scorer/parser decide presence and quality.
//
// Fetch policy:
//   - Each request gets a 5s AbortController timeout.
//   - Follow redirects (same-origin moves are normal: /robots.txt → /robots.txt/).
//   - Bail on non-2xx; treat 4xx as "not found" (the common case).
//   - We never throw; we always return a Result so downstream code is total.

const DEFAULT_TIMEOUT_MS = 12_000;
const UA =
  "OpenAgentRegistry/0.1 (+https://github.com/openagent-registry/openagent-registry; scanner)";

export interface FetchResult {
  url: string;
  found: boolean;
  status: number | null;
  body?: string;
  contentType?: string;
  error?: string;
  // Selected response headers we want to inspect later (bot-management signatures).
  headers?: Record<string, string>;
}

const HEADERS_OF_INTEREST = [
  "server",
  "x-datadome",
  "cf-mitigated",
  "cf-ray",
  "x-akamai-transformed",
  "x-akamai-edgescape",
  "x-px-block",
  "x-perimeter-x",
  "x-imperva-id",
  "x-iinfo",
  "x-sucuri-id",
];

export async function fetchWellKnown(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<FetchResult> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "text/plain, application/json;q=0.9, text/markdown;q=0.8, */*;q=0.5",
        "user-agent": UA,
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const headers: Record<string, string> = {};
    for (const h of HEADERS_OF_INTEREST) {
      const v = res.headers.get(h);
      if (v) headers[h] = v;
    }
    if (!res.ok) {
      // On non-2xx, still capture the body (truncated) and headers so we can
      // detect bot-management challenge pages downstream.
      const body = await res.text().catch(() => "");
      return {
        url,
        found: false,
        status: res.status,
        body: body.slice(0, 2000),
        headers,
      };
    }
    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();
    return { url, found: true, status: res.status, body, contentType, headers };
  } catch (err) {
    return {
      url,
      found: false,
      status: null,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(t);
  }
}

// The full list of endpoints we probe. Keep this in lockstep with scorer.ts.
export const WELL_KNOWNS = [
  { key: "homepage", path: "/" },
  { key: "robots_txt", path: "/robots.txt" },
  { key: "llms_txt", path: "/llms.txt" },
  { key: "llms_full_txt", path: "/llms-full.txt" },
  { key: "agents_txt", path: "/agents.txt" },
  { key: "agents_json_root", path: "/agents.json" },
  { key: "agents_json_wellknown", path: "/.well-known/agents.json" },
  { key: "agent_card", path: "/.well-known/agent-card.json" },
  { key: "api_catalog", path: "/.well-known/api-catalog" },
  { key: "agents_md", path: "/AGENTS.md" },
  // OpenAPI: standard + common non-standard paths. We probe several because
  // real APIs rarely sit at /openapi.json - most companies host it under
  // /docs/, /api/, /developer/, etc.
  { key: "openapi_json", path: "/openapi.json" },
  { key: "openapi_yaml", path: "/openapi.yaml" },
  { key: "swagger_json", path: "/swagger.json" },
  { key: "openapi_docs", path: "/docs/openapi.json" },
  { key: "openapi_api_docs", path: "/api-docs/openapi.json" },
  { key: "openapi_developer", path: "/developer/openapi.json" },
  { key: "openapi_api", path: "/api/openapi.json" },
  { key: "ai_plugin_legacy", path: "/.well-known/ai-plugin.json" },
  { key: "oauth_authorization_server", path: "/.well-known/oauth-authorization-server" },
  { key: "openid_configuration", path: "/.well-known/openid-configuration" },
  // Commercial / licensing surfaces - the "we have a paid path for agents"
  // signal. Strongest non-callable indicator of a mature agent posture.
  { key: "rsl_wellknown", path: "/.well-known/rsl.xml" },
  { key: "rsl_root", path: "/rsl.xml" },
  { key: "licensing_page", path: "/licensing" },
  { key: "license_page", path: "/license" },
  { key: "api_licensing", path: "/api/licensing" },
  { key: "ai_licensing", path: "/ai-licensing" },
] as const;

export type WellKnownKey = (typeof WELL_KNOWNS)[number]["key"];

export type RawScan = Partial<Record<WellKnownKey, FetchResult>>;

/**
 * Many SPAs respond to unknown paths with their HTML shell instead of 404.
 * If we naively treat that as a found text file, our text-format parsers
 * will produce garbage. This rejects responses that are clearly HTML when
 * we expected text/plain or text/markdown.
 */
export function isPlainTextResponse(r: FetchResult | undefined): boolean {
  if (!r || !r.found || !r.body) return false;
  const ct = (r.contentType ?? "").toLowerCase();
  // Accept canonical text content types.
  if (
    ct.startsWith("text/plain") ||
    ct.startsWith("text/markdown") ||
    ct.startsWith("text/x-markdown")
  ) {
    return true;
  }
  // If the server didn't declare a useful content-type, sniff the body.
  const head = r.body.slice(0, 200).trim().toLowerCase();
  if (head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("<head")) {
    return false;
  }
  // If we see HTML tags in the first chunk, it's not a text file.
  if (/<[a-z][a-z0-9]*(\s|>)/i.test(head)) return false;
  return true;
}

export function isJsonResponse(r: FetchResult | undefined): boolean {
  if (!r || !r.found || !r.body) return false;
  const ct = (r.contentType ?? "").toLowerCase();
  if (ct.includes("json")) return true;
  // Sniff: starts with { or [
  const head = r.body.trimStart();
  return head.startsWith("{") || head.startsWith("[");
}

export async function fetchAll(domain: string): Promise<RawScan> {
  const base = `https://${domain}`;
  const entries = await Promise.all(
    WELL_KNOWNS.map(async (wk) => {
      const res = await fetchWellKnown(`${base}${wk.path}`);
      return [wk.key, res] as const;
    }),
  );
  const out: RawScan = {};
  for (const [k, v] of entries) {
    out[k] = v;
  }
  return out;
}
