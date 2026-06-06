// Parallel fetchers for the well-known endpoints we care about.
// Each fetcher returns the raw body (string) plus the response URL it actually
// got — letting the scorer/parser decide presence and quality.
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
}

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
    if (!res.ok) {
      return { url, found: false, status: res.status };
    }
    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();
    return { url, found: true, status: res.status, body, contentType };
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
  { key: "robots_txt", path: "/robots.txt" },
  { key: "llms_txt", path: "/llms.txt" },
  { key: "llms_full_txt", path: "/llms-full.txt" },
  { key: "agents_txt", path: "/agents.txt" },
  { key: "agents_json_root", path: "/agents.json" },
  { key: "agents_json_wellknown", path: "/.well-known/agents.json" },
  { key: "agent_card", path: "/.well-known/agent-card.json" },
  { key: "api_catalog", path: "/.well-known/api-catalog" },
  { key: "agents_md", path: "/AGENTS.md" },
  { key: "openapi_json", path: "/openapi.json" },
  { key: "openapi_yaml", path: "/openapi.yaml" },
  { key: "swagger_json", path: "/swagger.json" },
  { key: "ai_plugin_legacy", path: "/.well-known/ai-plugin.json" },
  { key: "oauth_authorization_server", path: "/.well-known/oauth-authorization-server" },
  { key: "openid_configuration", path: "/.well-known/openid-configuration" },
] as const;

export type WellKnownKey = (typeof WELL_KNOWNS)[number]["key"];

export type RawScan = Partial<Record<WellKnownKey, FetchResult>>;

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
