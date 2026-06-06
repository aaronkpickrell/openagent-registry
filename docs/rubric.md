# Scoring Rubric

OpenAgent Registry uses a transparent, additive scoring model. Every signal has a public weight; every score is reproducible from the JSON profile a scan returns.

## Weights (v0.2)

Recalibrated to prioritize **real callable agent surfaces** over soft AEO signals.
The v0.1 weights inflated scores for any site publishing `llms.txt`, regardless
of whether it had any way for an agent to actually do something. v0.2 treats
`llms.txt` as a basic AEO move (small bonus), not a foundation.

| Tier | Signal | Points | Why |
|---|---|---|---|
| **Callable surface** | Listed in GitHub MCP Registry | +25 | Real, callable agent surface - top tier. |
| | `.well-known/agent-card.json` (A2A) | +25 | Agent-to-agent discoverable. |
| | OpenAPI spec | +18 | Canonical machine-readable API. |
| | `agents.json` (root or `.well-known`) | +15 | Structured manifest of supported protocols. |
| | Web Bot Auth / signed-agent support | +15 | Identity for crawlers and headless agents. |
| | OAuth/OIDC discovery | +12 | Standard user-authorized access. |
| | Documented partner / approval program | +10 | A path to higher rate limits / commerce. |
| | Official developer documentation | +8 | A path exists even without standardized formats. |
| **Declared intent** | `agents.txt` standard | +6 | Lightweight protocol declarations. |
| | RSL / licensing manifest | +6 | Machine-readable content licensing. |
| | Cloudflare Content Signals present | +5 | Explicit `search` / `ai-input` / `ai-train` directives. |
| | `AGENTS.md` | +4 | Human-readable agent instructions. |
| **Soft / AEO** | `llms.txt` | +3 | Agent-readable site summary. AEO move, not a callable surface. |
| | Listed in Agent Friendly Directory | +3 | Curated agent-usable listing. |
| | `robots.txt` parsed and allows docs/API | +3 | Basic policy file presence. |
| | `llms-full.txt` (extended) | +2 | Full content snapshot for LLMs. |
| | Listed in llms-txt-hub | +1 | Directory presence; not a quality signal. |
| | `ai-plugin.json` (deprecated) | 0 | No credit; outdated. |
| **Penalties** | Explicit AI crawler `Disallow: /` | -50 | Active prohibition. |
| | Blocks automation with no API alternative | -30 | Hard wall, no documented path. |
| | Edge bot-management product (DataDome / Cloudflare / etc.) | -20 | Blocks discovery; agents need allowlisting. |
| | Unknown / unparseable terms | -10 | Penalty for ambiguity. |

## Labels

| Score range | Label | What it means |
|---|---|---|
| 55+ | `agent-ready` | Multiple callable surfaces (e.g. OpenAPI + OAuth + A2A or MCP). An agent can integrate today. |
| 35–54 | `agent-friendly` | At least one callable surface plus supporting signals. Probably doable with effort. |
| 20–34 | `partial` | One callable surface OR multiple declared-intent signals. Usable, but limited. |
| 10–19 | `limited` | Discoverable but mostly via soft signals; API access is unclear. |
| 0–9 | `unknown` | Publishes `llms.txt` or similar AEO files, no real agent surface confirmed. |
| <0 | `blocked` | Actively hostile - explicit AI crawler block or edge bot-management. |

## Design principles

- **Additive, not multiplicative.** Each signal stands on its own; absence of any one signal doesn't disqualify the others.
- **Conservative parsing.** A signal counts only when the body parses cleanly. "Endpoint exists but isn't valid JSON" earns no points.
- **Penalties only on active hostility.** A site missing standards isn't blocked - it's just early. Negative scores require explicit "Disallow: /" against known agents or documented anti-automation terms.
- **Upstream credit.** If a site already ships an MCP server or A2A agent (via the GitHub MCP Registry or A2A Registry), we credit that without re-validating - those upstreams are the source of truth.
- **Reproducible.** Every weight is in `lib/scorer.ts`. Every score is `signals.map(s => s.points).sum()`. Open a PR to change a weight.

## Changing the rubric

Open an issue with a proposed delta and the reasoning. Weight changes are not breaking by default - old scores re-compute on next scan.
