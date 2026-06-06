import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">About OpenAgent Registry</h1>

      <section className="space-y-3 opacity-90">
        <p>
          OpenAgent Registry (OAR) is the open scanner, registry, and leaderboard for
          agent-ready websites. We do three things in one place:
        </p>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>
            Scan any URL for the full stack of agent-access signals - <span className="font-mono">llms.txt</span>,{" "}
            <span className="font-mono">agents.txt</span>, A2A, MCP, OpenAPI,{" "}
            <span className="font-mono">robots.txt</span> + Content Signals, OAuth, RSL.
          </li>
          <li>
            Score and rank by industry category against a transparent rubric.
          </li>
          <li>
            Generate a concrete approval-path checklist with deep links - not just &ldquo;you have
            OAuth&rdquo; but &ldquo;register here, request these scopes.&rdquo;
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Built on top of what already exists</h2>
        <p className="opacity-90">
          Several great projects cover pieces of this. OAR is the aggregator with opinion. We
          credit / link / pull from:
        </p>
        <ul className="list-disc list-inside space-y-1 opacity-90">
          <li>
            <a className="underline" href="https://github.com/thedaviddias/llms-txt-hub">
              llms-txt-hub
            </a>{" "}
            - the directory of sites publishing <span className="font-mono">llms.txt</span>.
          </li>
          <li>
            <a
              className="underline"
              href="https://gist.github.com/sklivvz/cc23ace1b277265e9828b6e39f6e9103"
            >
              Agent Friendly Directory
            </a>{" "}
            - curated agent-usable services.
          </li>
          <li>
            <a className="underline" href="https://github.com/prassanna-ravishankar/a2a-registry">
              A2A Registry
            </a>{" "}
            - live A2A agents with validation.
          </li>
          <li>
            <a className="underline" href="https://github.com/mcp">
              GitHub MCP Registry
            </a>{" "}
            - canonical MCP servers.
          </li>
          <li>
            <a className="underline" href="https://parallel.ai/blog/LLMTEXT-for-llmstxt">
              LLMTEXT
            </a>{" "}
            - <span className="font-mono">llms.txt</span> tooling.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Scoring</h2>
        <p className="opacity-90">
          Every weight is public; every score is reproducible from a profile&apos;s signals. See{" "}
          <Link className="underline" href="/docs/rubric">
            the rubric
          </Link>{" "}
          (or the file in the repo at <span className="font-mono">docs/rubric.md</span>).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">License & contributing</h2>
        <p className="opacity-90">
          Apache 2.0. See{" "}
          <a className="underline" href="https://github.com/openagent-registry/openagent-registry">
            the repo
          </a>{" "}
          for <span className="font-mono">CONTRIBUTING.md</span>. Three highest-leverage
          contributions: add a service to{" "}
          <span className="font-mono">data/seed.json</span>; tighten a parser; add approval-path
          data for a service you know well.
        </p>
      </section>
    </div>
  );
}
