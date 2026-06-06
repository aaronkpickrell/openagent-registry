# Scoring Rubric

OpenAgent Registry uses a transparent, additive scoring model. Every signal has a public weight; every score is reproducible from the JSON profile a scan returns.

## Weights

| Signal | Points | Why |
|---|---|---|
| Listed in GitHub MCP Registry | +25 | A real, callable agent surface. The most direct integration path. |
| `.well-known/agent-card.json` (A2A) | +25 | Agent-to-agent discoverable. |
| `agents.json` (root or `.well-known`) | +15 | Structured manifest of supported protocols. |
| OpenAPI spec (`openapi.json` / `swagger.json` / `openapi.yaml`) | +15 | Canonical machine-readable API. |
| Web Bot Auth / signed-agent support | +15 | Identity for crawlers and headless agents. |
| Official developer documentation | +10 | A path exists even without standardized formats. |
| Documented partner / approval program | +10 | A path to higher rate limits / commerce. |
| OAuth/OIDC discovery | +10 | Standard user-authorized access. |
| `agents.txt` standard | +10 | Lightweight protocol declarations. |
| `llms.txt` | +8 | Agent-readable site summary. |
| `AGENTS.md` | +8 | Human-readable agent instructions. |
| RSL / licensing manifest | +8 | Machine-readable content licensing. |
| `robots.txt` parsed and allows docs/API | +5 | At minimum a policy exists. |
| Cloudflare Content Signals present | +5 | Explicit `search` / `ai-input` / `ai-train` directives. |
| `llms-full.txt` (extended) | +5 | Full content snapshot for LLMs. |
| Listed in llms-txt-hub | +5 | Community recognition. |
| Listed in Agent Friendly Directory | +5 | Curated agent-usable listing. |
| `ai-plugin.json` (deprecated) | +2 | Outdated signal; weak but present. |
| Explicit AI crawler `Disallow: /` | -50 | Active prohibition. |
| Blocks automation with no API alternative | -30 | Hard wall, no documented path. |
| Unknown / unparseable terms | -10 | Penalty for ambiguity. |

## Labels

| Score range | Label | Color |
|---|---|---|
| 80+ | `agent-ready` | green |
| 60–79 | `agent-friendly` | light green |
| 40–59 | `partial` | amber |
| 20–39 | `limited` | orange |
| 0–19 | `unknown` | gray |
| <0 | `blocked` | red |

## Design principles

- **Additive, not multiplicative.** Each signal stands on its own; absence of any one signal doesn't disqualify the others.
- **Conservative parsing.** A signal counts only when the body parses cleanly. "Endpoint exists but isn't valid JSON" earns no points.
- **Penalties only on active hostility.** A site missing standards isn't blocked — it's just early. Negative scores require explicit "Disallow: /" against known agents or documented anti-automation terms.
- **Upstream credit.** If a site already ships an MCP server or A2A agent (via the GitHub MCP Registry or A2A Registry), we credit that without re-validating — those upstreams are the source of truth.
- **Reproducible.** Every weight is in `lib/scorer.ts`. Every score is `signals.map(s => s.points).sum()`. Open a PR to change a weight.

## Changing the rubric

Open an issue with a proposed delta and the reasoning. Weight changes are not breaking by default — old scores re-compute on next scan.
