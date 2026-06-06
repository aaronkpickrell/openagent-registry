import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import SearchBox from "@/components/SearchBox";
import { readAllProfiles } from "@/lib/cache";
import type { Profile } from "@/lib/types";

const LABEL_TONE: Record<Profile["label"], string> = {
  "agent-ready": "text-score-ready",
  "agent-friendly": "text-score-friendly",
  "commercially-gated": "text-purple-600 dark:text-purple-400",
  partial: "text-score-partial",
  limited: "text-score-limited",
  unknown: "text-score-unknown",
  blocked: "text-score-blocked",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const all = await readAllProfiles();
  const top = [...all].sort((a, b) => b.score - a.score).slice(0, 5);
  const blocked = [...all].filter((p) => p.score < 0).sort((a, b) => a.score - b.score).slice(0, 5);
  const totalScanned = all.length;

  return (
    <div className="space-y-16">
      <section className="space-y-6">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Is this site ready for agents?
        </h1>
        <p className="text-lg max-w-2xl opacity-80">
          OpenAgent Registry scans any URL for the full stack of agent-access signals  - 
          <span className="font-mono"> llms.txt</span>, <span className="font-mono">agents.txt</span>,{" "}
          <span className="font-mono">A2A</span>, <span className="font-mono">MCP</span>,{" "}
          <span className="font-mono">OpenAPI</span>, <span className="font-mono">robots.txt</span>,{" "}
          <span className="font-mono">OAuth</span>, plus bot-management at the edge - scores it,
          ranks it within its industry, and generates a concrete checklist of what the site (or
          its agents) need to do next.
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
          ,{" "}
          <Link className="underline" href="/vercel.com">
            vercel.com
          </Link>
          , or{" "}
          <Link className="underline" href="/airbnb.com">
            airbnb.com
          </Link>
          .
        </p>
      </section>

      {top.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Top scorers</h2>
            <Link href="/leaderboard" className="text-sm underline opacity-80 hover:opacity-100">
              full leaderboard →
            </Link>
          </div>
          <div className="grid gap-3">
            {top.map((p, i) => (
              <Link
                key={p.domain}
                href={`/${p.domain}`}
                className="flex items-center gap-4 border border-black/10 dark:border-white/10 rounded-md px-4 py-3 hover:border-black/40 dark:hover:border-white/40 transition-colors"
              >
                <span className="opacity-50 w-6 text-sm">{i + 1}</span>
                <div className="flex-1">
                  <div className="font-medium">{p.name ?? p.domain}</div>
                  <div className="text-xs opacity-60 font-mono">
                    {p.domain} · {p.category ?? "uncategorized"}
                  </div>
                </div>
                <span className={`text-xs uppercase tracking-wider ${LABEL_TONE[p.label]}`}>
                  {p.label}
                </span>
                <span className={`text-2xl font-mono font-semibold ${LABEL_TONE[p.label]}`}>
                  {p.score > 0 ? `+${p.score}` : p.score}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {blocked.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Currently blocking agents
          </h2>
          <p className="opacity-80 max-w-2xl text-sm">
            Sites flagged as actively hostile to agent access - either via explicit{" "}
            <span className="font-mono">robots.txt</span> blocks of known AI crawlers, or via
            edge bot-management products that challenge automated traffic before it reaches the
            application.
          </p>
          <div className="grid gap-2">
            {blocked.map((p) => (
              <Link
                key={p.domain}
                href={`/${p.domain}`}
                className="flex items-center gap-4 text-sm hover:underline"
              >
                <span className="font-mono opacity-70">{p.domain}</span>
                <span className="opacity-50 text-xs">{p.category}</span>
                <span className="flex-1" />
                <span className="font-mono text-score-blocked font-semibold">{p.score}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Categories</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => {
            const inCat = all.filter((p) => p.category === cat.slug);
            const top = [...inCat].sort((a, b) => b.score - a.score)[0];
            return (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="block border border-black/10 dark:border-white/10 rounded-lg p-4 hover:border-black/40 dark:hover:border-white/40 transition-colors"
              >
                <div className="text-xs uppercase tracking-wider opacity-60">{cat.slug}</div>
                <div className="text-lg font-medium mt-1">{cat.name}</div>
                <div className="text-sm opacity-70 mt-2">{cat.description}</div>
                {top && (
                  <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 flex justify-between text-xs">
                    <span className="opacity-70">
                      Leader: <span className="font-medium">{top.name ?? top.domain}</span>
                    </span>
                    <span className={`font-mono font-semibold ${LABEL_TONE[top.label]}`}>
                      {top.score > 0 ? `+${top.score}` : top.score}
                    </span>
                  </div>
                )}
                <div className="mt-1 text-xs opacity-50">{inCat.length} scanned</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">What we check</h2>
          <span className="text-xs opacity-60">{totalScanned} services scanned</span>
        </div>
        <p className="opacity-80 max-w-2xl">
          The full agent-access stack, in one report. Presence is necessary but not sufficient - we
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
          <li>Bot management / WAF at the edge</li>
        </ul>
      </section>
    </div>
  );
}
