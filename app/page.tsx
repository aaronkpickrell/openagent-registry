import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import SearchBox from "@/components/SearchBox";

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="space-y-6">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Is this site ready for agents?
        </h1>
        <p className="text-lg max-w-2xl opacity-80">
          OpenAgent Registry scans any URL for the full stack of agent-access signals —
          <span className="font-mono"> llms.txt</span>, <span className="font-mono">agents.txt</span>,{" "}
          <span className="font-mono">A2A</span>, <span className="font-mono">MCP</span>,{" "}
          <span className="font-mono">OpenAPI</span>, <span className="font-mono">robots.txt</span>,{" "}
          <span className="font-mono">OAuth</span> — scores it, ranks it within its industry, and
          generates a concrete checklist of what the site (or its agents) need to do next.
        </p>
        <SearchBox />
        <p className="text-sm opacity-60">
          Try{" "}
          <Link className="underline" href="/stripe.com">
            stripe.com
          </Link>
          ,{" "}
          <Link className="underline" href="/reddit.com">
            reddit.com
          </Link>
          , or{" "}
          <Link className="underline" href="/airbnb.com">
            airbnb.com
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Categories</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="block border border-black/10 dark:border-white/10 rounded-lg p-4 hover:border-black/40 dark:hover:border-white/40 transition-colors"
            >
              <div className="text-xs uppercase tracking-wider opacity-60">{cat.slug}</div>
              <div className="text-lg font-medium mt-1">{cat.name}</div>
              <div className="text-sm opacity-70 mt-2">{cat.description}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">What we check</h2>
        <p className="opacity-80 max-w-2xl">
          The full agent-access stack, in one report. Presence is necessary but not sufficient — we
          parse what we find and produce concrete next steps either to use the surface (for agent
          builders) or to publish it (for site owners).
        </p>
        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm font-mono opacity-90">
          <li>/llms.txt</li>
          <li>/llms-full.txt</li>
          <li>/agents.txt</li>
          <li>/agents.json (root + .well-known)</li>
          <li>/AGENTS.md</li>
          <li>/.well-known/agent-card.json (A2A)</li>
          <li>/.well-known/api-catalog (RFC 9727)</li>
          <li>/openapi.json + /swagger.json</li>
          <li>/robots.txt + Content Signals</li>
          <li>/.well-known/ai-plugin.json (legacy)</li>
          <li>MCP Registry presence (upstream)</li>
          <li>A2A Registry presence (upstream)</li>
        </ul>
      </section>
    </div>
  );
}
