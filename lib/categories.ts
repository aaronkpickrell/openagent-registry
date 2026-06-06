import type { CategoryDef } from "./types";

export const CATEGORIES: CategoryDef[] = [
  {
    slug: "rentals",
    name: "Rentals & Travel",
    description:
      "Car rental, lodging, vacation, and travel booking. The category most exposed to agentic booking workflows.",
  },
  {
    slug: "shopping",
    name: "Shopping & Commerce",
    description:
      "Marketplaces, retailers, and payment infrastructure. Where agentic commerce will hit first.",
  },
  {
    slug: "content",
    name: "Content & News",
    description:
      "Publishers and content platforms — the front line of AI training, attribution, and licensing.",
  },
  {
    slug: "social",
    name: "Social & Community",
    description:
      "Forums, microblogging, and community platforms. Standards are heating up fastest here.",
  },
  {
    slug: "developer",
    name: "Developer Platforms",
    description:
      "Code hosting, deploy targets, package registries, cloud infrastructure, data, and security tools. The largest pool of llms.txt adopters today.",
  },
  {
    slug: "ai",
    name: "AI & ML Platforms",
    description:
      "LLM providers, AI agents, ML infrastructure, and the agent-adjacent layer. The fastest-growing category — and the one agents call most.",
  },
];

export function getCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
