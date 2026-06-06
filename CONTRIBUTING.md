# Contributing to OpenAgent Registry

Thanks for considering a contribution. This project is community-owned infrastructure for the agent ecosystem — it gets better when more people use it and add to it.

## Three high-leverage ways to contribute

### 1. Add a service to the seed

Edit `data/seed.json` and open a PR. Required fields:

```json
{
  "domain": "example.com",
  "name": "Example",
  "category": "shopping",
  "homepage": "https://example.com",
  "notes": "Optional one-line note for context."
}
```

That's it. CI will run a live scan against it and the leaderboard will update on merge.

### 2. Improve a parser

`lib/parsers.ts` deliberately starts conservative — we'd rather report "found, not yet deeply parsed" than overclaim. If you can pull more structure out of any of these:

- `robots.txt` (incl. Cloudflare Content Signals: `search=`, `ai-input=`, `ai-train=`)
- `llms.txt` (and `llms-full.txt`)
- `.well-known/agent-card.json` (A2A schema)
- `agents.json` (root + `.well-known`)
- OpenAPI (3.x and Swagger 2.x)
- RSL manifests

…open a PR with a parser improvement + a test fixture in `__tests__/fixtures/`. The fixture is the most important part.

### 3. Approval-path data

This is the killer feature and the deepest moat. For each known service we want a concrete checklist:

> **To become an approved agent for Stripe:**
> 1. Register a Stripe account at <https://dashboard.stripe.com/register>
> 2. Create a Connect platform application — Standard, Express, or Custom
> 3. Request the `read_only` + `write` scopes for your use case at <https://...>
> 4. Implement webhook signature verification per <https://stripe.com/docs/webhooks/signatures>
> 5. Submit for production review via Connect dashboard

Edit `data/approval-paths/{domain}.md`. We accept partial entries — even one verified step is better than none.

## Scoring rubric changes

The scoring weights in `lib/scorer.ts` are intentionally public and modifiable, but changes need consensus. Open an issue first proposing a delta and the reasoning. We'll talk it through.

## Code style

- TypeScript everywhere, `strict` on
- Prettier defaults; ESLint via `pnpm lint`
- One feature per PR; small PRs welcome

## Tests

`pnpm test` runs the parser fixtures. New parsers must come with at least one fixture.

## Code of conduct

Be decent. Disagree on substance. Don't make the project unwelcoming for newcomers.
