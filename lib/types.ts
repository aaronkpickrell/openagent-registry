// Profile is the canonical shape returned by /api/scan and stored in the cache.
// Keep this stable - the data file format mirrors it.

export type SignalKey =
  | "mcp_registry"
  | "a2a_agent_card"
  | "agents_json"
  | "openapi"
  | "web_bot_auth"
  | "dev_docs"
  | "approval_path"
  | "oauth_discovery"
  | "agents_txt"
  | "llms_txt"
  | "agents_md"
  | "rsl"
  | "robots_allows"
  | "content_signals"
  | "llms_full_txt"
  | "in_llms_txt_hub"
  | "in_agent_friendly_directory"
  | "ai_plugin_json_legacy"
  | "licensed_commercial_access"
  | "explicit_prohibition"
  | "blocks_automation"
  | "blocked_by_bot_management"
  | "unknown_terms";

export interface Signal {
  key: SignalKey;
  found: boolean;
  url?: string; // where the evidence lives
  points: number; // signed weight applied
  detail?: string; // a one-line human-readable note about what was found
  parsed?: Record<string, unknown>; // optional structured payload
}

export type ScoreLabel =
  | "agent-ready"
  | "agent-friendly"
  | "partial"
  | "limited"
  | "unknown"
  | "commercially-gated"
  | "blocked";

export interface ApprovalStep {
  title: string;
  detail: string;
  link?: string;
  done?: boolean; // we can mark a step as already satisfied by the scan
}

export type CategorySlug =
  | "rentals"
  | "shopping"
  | "content"
  | "social"
  | "developer"
  | "ai";

export interface Profile {
  domain: string;
  name?: string;
  category?: CategorySlug;
  scanned_at: string; // ISO timestamp
  score: number; // signed integer
  label: ScoreLabel;
  signals: Signal[];
  approval_path: ApprovalStep[];
  recommended_next_steps: string[];
  notes?: string;
  // Computed lazily on read:
  category_rank?: number; // 1-indexed position within its category
}

export interface CategoryDef {
  slug: CategorySlug;
  name: string;
  description: string;
}

export interface SeedEntry {
  domain: string;
  name: string;
  category: CategorySlug;
  homepage: string;
  notes?: string;
}
