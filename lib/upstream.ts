// Mapping upstream category strings (llms-txt-hub, Agent Friendly Directory, etc.)
// into our 5 launch categories. Conservative: when in doubt, "developer" is the
// catch-all because most early-adopter llms.txt publishers are dev-facing tools.
// Future PRs can expand the category set; for now we keep it small.

import type { CategorySlug } from "./types";

const HUB_CATEGORY_MAP: Record<string, CategorySlug> = {
  // llms-txt-hub categories observed in the data:
  "ai-ml": "ai",
  "ai": "ai",
  "ml": "ai",
  "llm": "ai",
  "agents": "ai",
  "developer-tools": "developer",
  "developer": "developer",
  "infrastructure-cloud": "developer",
  "data-analytics": "developer",
  "security-identity": "developer",
  "integration-automation": "developer",
  "design-ux": "developer",
  "products-platforms": "developer",
  "blog": "content",
  "blog-personal": "content",
  "content": "content",
  "news": "content",
  "media": "content",
  "publisher": "content",
  "ecommerce": "shopping",
  "ecommerce-retail": "shopping",
  "retail": "shopping",
  "shopping": "shopping",
  "marketplace": "shopping",
  "payment": "shopping",
  "fintech-finance": "shopping",
  "social": "social",
  "social-community": "social",
  "community": "social",
  "communication": "social",
  "travel": "rentals",
  "travel-rentals": "rentals",
  "rentals": "rentals",
  "hospitality": "rentals",
  "transportation": "rentals",
};

/**
 * Normalize an upstream category string to one of our slugs.
 * Unknown categories default to "developer" — the broadest catch-all for
 * agent-facing infrastructure. Site owners + PRs can recategorize later.
 */
export function mapUpstreamCategory(raw: string | null | undefined): CategorySlug {
  if (!raw) return "developer";
  const key = raw.toLowerCase().trim();
  return HUB_CATEGORY_MAP[key] ?? "developer";
}

/**
 * Strip protocol + path + www, return a bare hostname suitable for our
 * domain-keyed cache.
 */
export function hostOf(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
