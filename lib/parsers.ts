// Parsers convert a raw fetched body into a small, structured fact-set.
// They are intentionally conservative: every parser handles the common case
// and reports unknowns as null rather than guessing. The goal is "no false
// positives" — better to under-claim than to overclaim.

export interface RobotsParsed {
  user_agents: string[];
  // Cloudflare Content Signals (search=, ai-input=, ai-train=)
  content_signals: {
    search?: "yes" | "no" | "unknown";
    ai_input?: "yes" | "no" | "unknown";
    ai_train?: "yes" | "no" | "unknown";
  };
  // Did we see an explicit block on common AI bots?
  blocks_ai_crawlers: string[]; // list of UAs explicitly disallowed
  has_sitemap: boolean;
}

const KNOWN_AI_UA = [
  "gptbot",
  "claudebot",
  "claude-web",
  "anthropic-ai",
  "perplexitybot",
  "google-extended",
  "oai-searchbot",
  "applebot-extended",
  "ccbot",
  "bytespider",
  "amazonbot",
  "diffbot",
];

export function parseRobots(body: string): RobotsParsed {
  const out: RobotsParsed = {
    user_agents: [],
    content_signals: {},
    blocks_ai_crawlers: [],
    has_sitemap: false,
  };
  let currentUA: string | null = null;
  // Cloudflare Content Signals are conventionally placed in comments like:
  // # Content-Signal: ai-train=no, ai-input=yes, search=yes
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.toLowerCase().startsWith("sitemap:")) {
      out.has_sitemap = true;
      continue;
    }
    if (line.startsWith("#")) {
      const m = line.match(/content[-\s]*signal\s*:?\s*(.+)/i);
      if (m) {
        for (const seg of m[1].split(/[,\s]+/)) {
          const kv = seg.split("=");
          if (kv.length !== 2) continue;
          const key = kv[0].toLowerCase().replace(/-/g, "_");
          const val = kv[1].toLowerCase();
          const norm = val === "yes" || val === "no" ? val : "unknown";
          if (key === "search" || key === "ai_input" || key === "ai_train") {
            out.content_signals[key as keyof RobotsParsed["content_signals"]] = norm;
          }
        }
      }
      continue;
    }
    const [keyPart, ...rest] = line.split(":");
    if (!keyPart || rest.length === 0) continue;
    const key = keyPart.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      currentUA = value.toLowerCase();
      if (!out.user_agents.includes(currentUA)) out.user_agents.push(currentUA);
    } else if (key === "disallow" && currentUA && value === "/") {
      if (KNOWN_AI_UA.includes(currentUA) && !out.blocks_ai_crawlers.includes(currentUA)) {
        out.blocks_ai_crawlers.push(currentUA);
      }
    }
  }
  return out;
}

export interface LlmsTxtParsed {
  title?: string;
  // very lightweight: just count sections (## headings) and link lines
  section_count: number;
  link_count: number;
  preview?: string;
}

export function parseLlmsTxt(body: string): LlmsTxtParsed {
  const lines = body.split(/\r?\n/);
  const titleLine = lines.find((l) => l.startsWith("# "));
  const sections = lines.filter((l) => /^##\s/.test(l)).length;
  const links = lines.filter((l) => /\[[^\]]+\]\([^)]+\)/.test(l)).length;
  return {
    title: titleLine?.slice(2).trim(),
    section_count: sections,
    link_count: links,
    preview: body.slice(0, 240),
  };
}

export interface AgentCardParsed {
  name?: string;
  description?: string;
  url?: string;
  skill_count?: number;
  auth_schemes?: string[];
  raw_valid_json: boolean;
}

export function parseAgentCard(body: string): AgentCardParsed {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    const skills = Array.isArray(data.skills) ? data.skills.length : undefined;
    const sec = data.securitySchemes ?? data.security_schemes;
    const auth_schemes =
      sec && typeof sec === "object"
        ? Object.keys(sec as Record<string, unknown>)
        : undefined;
    return {
      name: typeof data.name === "string" ? data.name : undefined,
      description: typeof data.description === "string" ? data.description : undefined,
      url: typeof data.url === "string" ? data.url : undefined,
      skill_count: skills,
      auth_schemes,
      raw_valid_json: true,
    };
  } catch {
    return { raw_valid_json: false };
  }
}

export interface OpenApiParsed {
  version?: string; // OpenAPI version (3.x) or Swagger (2.x)
  title?: string;
  path_count?: number;
  raw_valid: boolean;
}

export function parseOpenApi(body: string): OpenApiParsed {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    const v =
      (typeof data.openapi === "string" && data.openapi) ||
      (typeof data.swagger === "string" && data.swagger) ||
      undefined;
    const info = data.info as Record<string, unknown> | undefined;
    const paths = data.paths as Record<string, unknown> | undefined;
    return {
      version: v || undefined,
      title: info && typeof info.title === "string" ? info.title : undefined,
      path_count: paths ? Object.keys(paths).length : undefined,
      raw_valid: true,
    };
  } catch {
    return { raw_valid: false };
  }
}

export interface AgentsTxtParsed {
  // The proposed standard at agents-txt.com: one declaration per line, e.g.
  //   mcp: https://example.com/mcp
  //   a2a: /.well-known/agent-card.json
  //   agents.json: /agents.json
  declarations: Record<string, string>;
}

export function parseAgentsTxt(body: string): AgentsTxtParsed {
  const out: Record<string, string> = {};
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key && value) out[key] = value;
  }
  return { declarations: out };
}
