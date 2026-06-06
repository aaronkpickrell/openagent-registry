# OpenAgent Registry

> The open registry, scanner, and leaderboard for agent-ready websites and services.

OpenAgent Registry (**OAR**) does three things in one place:

1. **Scans** any URL for the full stack of agent-access signals - `llms.txt`, `agents.txt` / `agents.json`, `AGENTS.md`, `.well-known/agent-card.json`, `robots.txt` + Content Signals, OpenAPI, OAuth discovery, RSL licensing, MCP/A2A registry presence - and aggregates upstream registries instead of re-doing their work.
2. **Scores** each site against a transparent, public rubric and ranks it within its industry category.
3. **Tells you what to do about it** - a concrete approval-path checklist with deep links to the actual developer applications, OAuth signups, partner programs, and standards-adoption steps. *Lead with the checklist; the score is supporting evidence.*

Built as **the missing aggregator** on top of the great work that already exists. We pull from / link to:

- [llms-txt-hub](https://github.com/thedaviddias/llms-txt-hub) - directory of sites publishing `llms.txt`
- [Agent Friendly Directory](https://gist.github.com/sklivvz/cc23ace1b277265e9828b6e39f6e9103) - curated agent-usable services
- [A2A Registry](https://github.com/prassanna-ravishankar/a2a-registry) - live A2A agents
- [GitHub MCP Registry](https://github.com/mcp) - canonical MCP servers
- [LLMTEXT](https://parallel.ai/blog/LLMTEXT-for-llmstxt) - `llms.txt` validation
- Standards: [llms.txt](https://llmstxt.org/), [agents.txt / agents.json](https://agents-txt.com/), [A2A Protocol](https://a2a-protocol.org/), [Web Bot Auth](https://datatracker.ietf.org/doc/draft-meunier-web-bot-auth-architecture/), [RSL](https://rslstandard.org/)

What OAR adds that none of the above does today:

- **Comparative leaderboards by industry category** (rentals, shopping, content, social, developer)
- **Approval-path generator** - concrete next steps, not just "you have OAuth"
- **Aggregation across the full stack** in one report
- **Change monitoring** over time
- **A public, free API** so agents (including your own) can query it before calling external services

## Status

Pre-alpha but live. **Public deploy: https://openagent-registry.vercel.app**.

After the v0.1 import, the registry tracks **1,400+ services across 6 industry categories**, sourced from the original seed plus an import of [llms-txt-hub](https://github.com/thedaviddias/llms-txt-hub). Every service has a live score, a label, and a generated approval-path checklist. Looking for contributors - especially for approval-path data per service (the moat).

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **No backend service** in v0 - Next.js API routes do the scanning
- Local JSON cache for MVP; Postgres or Vercel KV for production scale
- Deploys natively to **Vercel**

## Quickstart

```bash
pnpm install
pnpm dev
```

Then open <http://localhost:3000>.

## How scoring works

See [`docs/rubric.md`](docs/rubric.md). Every signal is weighted, every weight is published, every score is reproducible from the JSON profile. No black-box scoring.

The current rubric (summary):

| Signal | Points |
|---|---|
| Official MCP server in MCP Registry | +25 |
| A2A Agent Card found | +25 |
| `agents.json` (root or `.well-known`) | +15 |
| OpenAPI spec found | +15 |
| Web Bot Auth / signed-agent support | +15 |
| Official developer docs | +10 |
| Partner / approval path documented | +10 |
| OAuth/OIDC discovery | +10 |
| `agents.txt` standard | +10 |
| `llms.txt` | +8 |
| `AGENTS.md` | +8 |
| RSL / licensing manifest | +8 |
| `robots.txt` allows docs/API | +5 |
| Cloudflare Content Signals present | +5 |
| `llms-full.txt` (extended) | +5 |
| Listed in llms-txt-hub | +5 |
| Listed in Agent Friendly Directory | +5 |
| `ai-plugin.json` (deprecated signal) | +2 |
| Explicit bot/agent prohibition | -50 |
| Blocks automation, no API alternative | -30 |
| Unknown terms / can't parse | -10 |

Labels:

| Score | Label |
|---|---|
| 80–100 | Agent-ready |
| 60–79 | Agent-friendly |
| 40–59 | Partially agent-accessible |
| 20–39 | API-only / limited |
| 0–19 | Unknown |
| <0 | Likely blocked |

## Categories

- **Rentals & Travel** - Airbnb, Booking, Hertz, Avis, Enterprise, Expedia, Vrbo, AutoRentals
- **Shopping & Commerce** - Amazon, Shopify, Stripe, Target, Walmart, BestBuy, Etsy
- **Content & News** - NYT, WaPo, Bloomberg, Reuters, Substack, Medium
- **Social & Community** - Reddit, X, LinkedIn, Bluesky, Mastodon, Discord
- **Developer Platforms** - GitHub, Vercel, Cloudflare, npm, AWS, plus 800+ dev tools from the upstream import
- **AI & ML Platforms** - Anthropic, OpenAI, and 500+ AI/ML platforms publishing `llms.txt`

Within each category, services are ranked by their AgentRank score. The category page is the SEO-friendly editorial surface: *"Top agent-ready rental sites, [month] [year]"*.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). The three highest-leverage contributions today:

1. **Add services** to `data/seed.json` (a category, a homepage URL, optional notes) - opens a PR; CI runs a scan against it.
2. **Tighten parsers** for the well-known files. The MVP parsers are intentionally conservative - better parsers raise the data quality for everyone.
3. **Approval-path data** - concrete next-step instructions per service (developer signup URL, OAuth scopes needed, partner-program form). This is the killer feature; quality is the moat.

## License

[Apache 2.0](LICENSE).
