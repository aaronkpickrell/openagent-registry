import { isJsonResponse, isPlainTextResponse, type RawScan } from "./fetchers";
import {
  parseAgentCard,
  parseAgentsTxt,
  parseLlmsTxt,
  parseOpenApi,
  parseRobots,
} from "./parsers";
import { detectBotManagement, productName } from "./botmgmt";
import type { ApprovalStep, Profile, ScoreLabel, Signal } from "./types";

// Public, transparent scoring weights. Negative values are penalties.
// Keep in lockstep with docs/rubric.md.
export const WEIGHTS = {
  mcp_registry: 25,
  a2a_agent_card: 25,
  agents_json: 15,
  openapi: 15,
  web_bot_auth: 15,
  dev_docs: 10,
  approval_path: 10,
  oauth_discovery: 10,
  agents_txt: 10,
  llms_txt: 8,
  agents_md: 8,
  rsl: 8,
  robots_allows: 5,
  content_signals: 5,
  llms_full_txt: 5,
  in_llms_txt_hub: 5,
  in_agent_friendly_directory: 5,
  ai_plugin_json_legacy: 2,
  explicit_prohibition: -50,
  blocked_by_bot_management: -20,
  blocks_automation: -30,
  unknown_terms: -10,
} as const;

export function labelFor(score: number): ScoreLabel {
  if (score < 0) return "blocked";
  if (score < 20) return "unknown";
  if (score < 40) return "limited";
  if (score < 60) return "partial";
  if (score < 80) return "agent-friendly";
  return "agent-ready";
}

interface AggregateContext {
  inLlmsTxtHub?: boolean;
  inAgentFriendlyDirectory?: boolean;
  inMcpRegistry?: boolean;
}

export function score(
  domain: string,
  raw: RawScan,
  ctx: AggregateContext = {},
): { signals: Signal[]; score: number; approval: ApprovalStep[]; nextSteps: string[] } {
  const signals: Signal[] = [];
  const push = (s: Signal) => signals.push(s);
  const base = `https://${domain}`;

  // --- bot management / WAF blocking (run FIRST so the report leads with this) ---
  const bm = detectBotManagement(raw.homepage);
  if (bm) {
    push({
      key: "blocked_by_bot_management",
      found: true,
      url: raw.homepage?.url,
      points: WEIGHTS.blocked_by_bot_management,
      detail: `Edge-protected by ${productName(bm.product)}. ${bm.evidence}. The scanner can only see what reaches the application — if you protect with bot management, expect agents to be unable to discover your well-known files even if you publish them.`,
      parsed: { product: bm.product, evidence: bm.evidence },
    });
  }

  // --- llms.txt ---
  const llms = raw.llms_txt;
  if (isPlainTextResponse(llms) && llms?.body) {
    const p = parseLlmsTxt(llms.body);
    push({
      key: "llms_txt",
      found: true,
      url: llms.url,
      points: WEIGHTS.llms_txt,
      detail: p.title
        ? `Title: "${p.title}" · ${p.section_count} sections · ${p.link_count} links`
        : `${p.section_count} sections · ${p.link_count} links`,
      parsed: p as unknown as Record<string, unknown>,
    });
  } else {
    push({ key: "llms_txt", found: false, points: 0 });
  }

  // --- llms-full.txt ---
  const llmsFull = raw.llms_full_txt;
  if (llmsFull && isPlainTextResponse(llmsFull)) {
    push({
      key: "llms_full_txt",
      found: true,
      url: llmsFull.url,
      points: WEIGHTS.llms_full_txt,
      detail: `${(llmsFull.body ?? "").length} bytes of extended LLM context`,
    });
  } else {
    push({ key: "llms_full_txt", found: false, points: 0 });
  }

  // --- agents.txt ---
  const agentsTxt = raw.agents_txt;
  if (isPlainTextResponse(agentsTxt) && agentsTxt?.body) {
    const p = parseAgentsTxt(agentsTxt.body);
    const declared = Object.keys(p.declarations);
    push({
      key: "agents_txt",
      found: true,
      url: agentsTxt.url,
      points: WEIGHTS.agents_txt,
      detail: declared.length
        ? `Declares: ${declared.join(", ")}`
        : "Present but no recognized declarations",
      parsed: p as unknown as Record<string, unknown>,
    });
  } else {
    push({ key: "agents_txt", found: false, points: 0 });
  }

  // --- agents.json (either location) ---
  const agentsJson = isJsonResponse(raw.agents_json_root)
    ? raw.agents_json_root
    : isJsonResponse(raw.agents_json_wellknown)
      ? raw.agents_json_wellknown
      : null;
  if (agentsJson?.found) {
    push({
      key: "agents_json",
      found: true,
      url: agentsJson.url,
      points: WEIGHTS.agents_json,
      detail: "Present",
    });
  } else {
    push({ key: "agents_json", found: false, points: 0 });
  }

  // --- A2A agent-card ---
  const card = raw.agent_card;
  if (isJsonResponse(card) && card?.body) {
    const p = parseAgentCard(card.body);
    if (p.raw_valid_json) {
      push({
        key: "a2a_agent_card",
        found: true,
        url: card.url,
        points: WEIGHTS.a2a_agent_card,
        detail: p.name
          ? `${p.name}${p.skill_count != null ? ` · ${p.skill_count} skills` : ""}`
          : "Valid agent-card JSON",
        parsed: p as unknown as Record<string, unknown>,
      });
    } else {
      push({
        key: "a2a_agent_card",
        found: false,
        url: card.url,
        points: 0,
        detail: "Endpoint exists but payload is not valid JSON",
      });
    }
  } else {
    push({ key: "a2a_agent_card", found: false, points: 0 });
  }

  // --- AGENTS.md ---
  const agentsMd = raw.agents_md;
  if (agentsMd && isPlainTextResponse(agentsMd)) {
    push({
      key: "agents_md",
      found: true,
      url: agentsMd.url,
      points: WEIGHTS.agents_md,
      detail: `${(agentsMd.body ?? "").length} bytes`,
    });
  } else {
    push({ key: "agents_md", found: false, points: 0 });
  }

  // --- OpenAPI ---
  const openapi = isJsonResponse(raw.openapi_json)
    ? raw.openapi_json
    : isJsonResponse(raw.swagger_json)
      ? raw.swagger_json
      : raw.openapi_yaml?.found && /^(openapi|swagger)\s*:/i.test(raw.openapi_yaml.body ?? "")
        ? raw.openapi_yaml
        : null;
  if (openapi?.found && openapi.body) {
    const p = parseOpenApi(openapi.body);
    if (p.raw_valid) {
      push({
        key: "openapi",
        found: true,
        url: openapi.url,
        points: WEIGHTS.openapi,
        detail: p.version
          ? `OpenAPI ${p.version}${p.title ? ` · ${p.title}` : ""}${
              p.path_count != null ? ` · ${p.path_count} paths` : ""
            }`
          : "Found",
        parsed: p as unknown as Record<string, unknown>,
      });
    } else {
      push({
        key: "openapi",
        found: false,
        url: openapi.url,
        points: 0,
        detail: "Endpoint exists but body is not valid OpenAPI JSON",
      });
    }
  } else {
    push({ key: "openapi", found: false, points: 0 });
  }

  // --- OAuth discovery ---
  const oauth = raw.oauth_authorization_server?.found
    ? raw.oauth_authorization_server
    : raw.openid_configuration?.found
      ? raw.openid_configuration
      : null;
  if (oauth?.found) {
    push({
      key: "oauth_discovery",
      found: true,
      url: oauth.url,
      points: WEIGHTS.oauth_discovery,
      detail: "OAuth/OIDC discovery document present",
    });
  } else {
    push({ key: "oauth_discovery", found: false, points: 0 });
  }

  // --- robots.txt + Content Signals ---
  const robots = raw.robots_txt;
  if (isPlainTextResponse(robots) && robots?.body) {
    const p = parseRobots(robots.body);
    push({
      key: "robots_allows",
      found: true,
      url: robots.url,
      points: WEIGHTS.robots_allows,
      detail: `${p.user_agents.length} UA rules · sitemap: ${p.has_sitemap ? "yes" : "no"}`,
      parsed: p as unknown as Record<string, unknown>,
    });
    const csKeys = Object.keys(p.content_signals);
    if (csKeys.length > 0) {
      push({
        key: "content_signals",
        found: true,
        url: robots.url,
        points: WEIGHTS.content_signals,
        detail: csKeys.map((k) => `${k}=${(p.content_signals as Record<string, string>)[k]}`).join(", "),
        parsed: p.content_signals as unknown as Record<string, unknown>,
      });
    } else {
      push({ key: "content_signals", found: false, points: 0 });
    }
    if (p.blocks_ai_crawlers.length > 0) {
      push({
        key: "blocks_automation",
        found: true,
        url: robots.url,
        points: WEIGHTS.blocks_automation,
        detail: `Explicit Disallow for: ${p.blocks_ai_crawlers.join(", ")}`,
        parsed: { blocks: p.blocks_ai_crawlers },
      });
    }
  } else {
    push({ key: "robots_allows", found: false, points: 0 });
    push({ key: "content_signals", found: false, points: 0 });
  }

  // --- ai-plugin.json (legacy GPT-store manifest) ---
  if (raw.ai_plugin_legacy?.found) {
    push({
      key: "ai_plugin_json_legacy",
      found: true,
      url: raw.ai_plugin_legacy.url,
      points: WEIGHTS.ai_plugin_json_legacy,
      detail: "Legacy OpenAI plugin manifest present (deprecated signal)",
    });
  } else {
    push({ key: "ai_plugin_json_legacy", found: false, points: 0 });
  }

  // --- Upstream registry presence (context-supplied) ---
  if (ctx.inMcpRegistry) {
    push({
      key: "mcp_registry",
      found: true,
      points: WEIGHTS.mcp_registry,
      detail: "Listed in the GitHub MCP Registry",
      url: "https://github.com/mcp",
    });
  } else {
    push({ key: "mcp_registry", found: false, points: 0 });
  }
  if (ctx.inLlmsTxtHub) {
    push({
      key: "in_llms_txt_hub",
      found: true,
      points: WEIGHTS.in_llms_txt_hub,
      detail: "Listed in llms-txt-hub",
      url: "https://github.com/thedaviddias/llms-txt-hub",
    });
  } else {
    push({ key: "in_llms_txt_hub", found: false, points: 0 });
  }
  if (ctx.inAgentFriendlyDirectory) {
    push({
      key: "in_agent_friendly_directory",
      found: true,
      points: WEIGHTS.in_agent_friendly_directory,
      detail: "Listed in Agent Friendly Directory",
      url: "https://gist.github.com/sklivvz/cc23ace1b277265e9828b6e39f6e9103",
    });
  } else {
    push({ key: "in_agent_friendly_directory", found: false, points: 0 });
  }

  const total = signals.reduce((s, sig) => s + sig.points, 0);
  const approval = buildApprovalPath(signals, base);
  const nextSteps = buildNextSteps(signals);

  return { signals, score: total, approval, nextSteps };
}

function findSig(signals: Signal[], key: Signal["key"]): Signal | undefined {
  return signals.find((s) => s.key === key);
}

function buildApprovalPath(signals: Signal[], base: string): ApprovalStep[] {
  // Build a generic "to access this site as an agent" checklist by inspecting
  // which signals we already saw. Service-specific paths are layered on top
  // from data/approval-paths/{domain}.md (not implemented in v0).
  const steps: ApprovalStep[] = [];
  const openapi = findSig(signals, "openapi");
  const oauth = findSig(signals, "oauth_discovery");
  const card = findSig(signals, "a2a_agent_card");
  const blocks = findSig(signals, "blocks_automation");
  const bm = findSig(signals, "blocked_by_bot_management");

  if (bm?.found) {
    steps.push({
      title: "Identify yourself at the edge before doing anything else",
      detail:
        "This site is protected by bot management. Anonymous scans see nothing because every request is challenged or blocked. Even if you have valid OAuth or API credentials, you'll need to either (a) be on the operator's allowlist, (b) sign your requests via Web Bot Auth so the bot-management product can recognize you, or (c) request inclusion in the verified-bots / signed-agents directory the operator uses.",
      done: false,
    });
  }
  if (blocks?.found) {
    steps.push({
      title: "Respect explicit crawler block",
      detail:
        "robots.txt disallows known AI crawlers. Do not crawl with those user-agents. Look for a partner / data-licensing path before automating.",
      done: false,
    });
  }
  if (openapi?.found) {
    steps.push({
      title: "Use the published OpenAPI",
      detail:
        "Generate a client from the spec; treat it as your primary interface. Pair with OAuth where available.",
      link: openapi.url,
      done: true,
    });
  } else {
    steps.push({
      title: "Check for an undocumented developer API",
      detail:
        "No OpenAPI at the standard paths. Look for /developer, /developers, /docs, /api for hand-authored documentation.",
      link: `${base}/developers`,
      done: false,
    });
  }
  if (oauth?.found) {
    steps.push({
      title: "Register an OAuth application",
      detail:
        "OAuth/OIDC discovery is published. Register a client, pick narrow scopes, implement signature verification on webhooks.",
      link: oauth.url,
      done: true,
    });
  } else {
    steps.push({
      title: "Find the developer signup",
      detail:
        "No standard OAuth discovery — most sites still have a developer-portal signup. Find the OAuth client registration page on their site.",
      done: false,
    });
  }
  if (card?.found) {
    steps.push({
      title: "Talk to the A2A agent directly",
      detail: "An agent-card is published — your agent can call this site's agent via A2A.",
      link: card.url,
      done: true,
    });
  }
  steps.push({
    title: "Publish your own agent identity",
    detail:
      "Generate an Ed25519 keypair, host a public key directory, sign your HTTP requests (Web Bot Auth), apply to Cloudflare's bots & agents directory if you cross their edge.",
    link: "https://developers.cloudflare.com/bots/concepts/bot/verified-bots/",
    done: false,
  });
  steps.push({
    title: "Respect robots.txt and Content Signals",
    detail:
      "Even when you are an approved agent, honor the site's policy preferences. Cache them; refresh weekly.",
    done: true,
  });
  return steps;
}

function buildNextSteps(signals: Signal[]): string[] {
  const out: string[] = [];
  for (const s of signals) {
    if (s.found) continue;
    switch (s.key) {
      case "llms_txt":
        out.push("Publish /llms.txt — a curated markdown index of your useful docs for LLMs.");
        break;
      case "agents_txt":
        out.push("Publish /agents.txt declaring which agent protocols you support.");
        break;
      case "agents_md":
        out.push("Publish /AGENTS.md with human-readable agent instructions.");
        break;
      case "openapi":
        out.push("Publish your API as OpenAPI 3.x at a discoverable location.");
        break;
      case "oauth_discovery":
        out.push("Expose OAuth/OIDC discovery at /.well-known/oauth-authorization-server.");
        break;
      case "a2a_agent_card":
        out.push(
          "If you operate an agent, publish /.well-known/agent-card.json so others can discover it.",
        );
        break;
      default:
        break;
    }
  }
  return out;
}

export function buildProfile(args: {
  domain: string;
  raw: RawScan;
  ctx?: AggregateContext;
  name?: string;
  category?: Profile["category"];
}): Profile {
  const { signals, score: total, approval, nextSteps } = score(args.domain, args.raw, args.ctx ?? {});
  return {
    domain: args.domain,
    name: args.name,
    category: args.category,
    scanned_at: new Date().toISOString(),
    score: total,
    label: labelFor(total),
    signals,
    approval_path: approval,
    recommended_next_steps: nextSteps,
  };
}
