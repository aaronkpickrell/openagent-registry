import { notFound } from "next/navigation";
import Link from "next/link";
import seed from "@/data/seed.json";
import { normalizeDomain } from "@/lib/domain";
import { fetchAll } from "@/lib/fetchers";
import { buildProfile, WEIGHTS } from "@/lib/scorer";
import { readProfile, writeProfile, readAllProfiles } from "@/lib/cache";
import { getCategory } from "@/lib/categories";
import type { CategorySlug, Profile, SeedEntry, Signal } from "@/lib/types";

const SEED = seed as SeedEntry[];
const TTL_MS = 1000 * 60 * 60 * 6;

const LABEL_STYLE: Record<Profile["label"], { tone: string; bg: string }> = {
  "agent-ready": { tone: "text-score-ready", bg: "bg-score-ready/10 border-score-ready/30" },
  "agent-friendly": { tone: "text-score-friendly", bg: "bg-score-friendly/10 border-score-friendly/30" },
  partial: { tone: "text-score-partial", bg: "bg-score-partial/10 border-score-partial/30" },
  limited: { tone: "text-score-limited", bg: "bg-score-limited/10 border-score-limited/30" },
  unknown: { tone: "text-score-unknown", bg: "bg-score-unknown/10 border-score-unknown/30" },
  blocked: { tone: "text-score-blocked", bg: "bg-score-blocked/10 border-score-blocked/30" },
};

async function getOrScan(domain: string): Promise<Profile> {
  const cached = await readProfile(domain);
  if (cached) {
    const age = Date.now() - new Date(cached.scanned_at).getTime();
    if (age < TTL_MS) return cached;
  }
  const seedEntry = SEED.find((s) => s.domain === domain);
  const raw = await fetchAll(domain);
  const profile = buildProfile({
    domain,
    raw,
    name: seedEntry?.name,
    category: seedEntry?.category as CategorySlug | undefined,
  });
  await writeProfile(profile);
  return profile;
}

async function categoryRank(profile: Profile): Promise<number | undefined> {
  if (!profile.category) return undefined;
  const all = await readAllProfiles();
  const peers = all
    .filter((p) => p.category === profile.category)
    .sort((a, b) => b.score - a.score);
  const idx = peers.findIndex((p) => p.domain === profile.domain);
  return idx >= 0 ? idx + 1 : undefined;
}

export default async function DomainPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: rawDomain } = await params;
  const domain = normalizeDomain(decodeURIComponent(rawDomain));
  if (!domain) notFound();
  const profile = await getOrScan(domain);
  const rank = await categoryRank(profile);
  const category = profile.category ? getCategory(profile.category) : undefined;
  const labelStyle = LABEL_STYLE[profile.label];

  const foundSignals = profile.signals.filter((s) => s.found || s.points < 0);
  const missingSignals = profile.signals.filter((s) => !s.found && s.points >= 0);

  return (
    <div className="space-y-12">
      {/* Header card */}
      <section className={`rounded-xl border p-6 ${labelStyle.bg}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {profile.name ?? profile.domain}
            </h1>
            <p className="text-sm opacity-70 font-mono">{profile.domain}</p>
          </div>
          <div className="text-right">
            <div className={`text-5xl font-semibold ${labelStyle.tone}`}>{profile.score}</div>
            <div className={`uppercase tracking-wider text-xs font-medium ${labelStyle.tone}`}>
              {profile.label}
            </div>
          </div>
        </div>
        {category && (
          <p className="text-sm mt-4 opacity-80">
            Category:{" "}
            <Link href={`/category/${category.slug}`} className="underline">
              {category.name}
            </Link>
            {rank != null && <span> · ranked #{rank} in category</span>}
          </p>
        )}
        <p className="text-xs opacity-60 mt-2">
          Scanned {new Date(profile.scanned_at).toLocaleString()}
        </p>
      </section>

      {/* Approval checklist (the hero — lead with what to DO) */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          How to access {profile.name ?? profile.domain} as an agent
        </h2>
        <ol className="space-y-3">
          {profile.approval_path.map((step, i) => (
            <li
              key={i}
              className="flex gap-3 border border-black/10 dark:border-white/10 rounded-md p-4"
            >
              <div className="flex-shrink-0 mt-0.5">
                {step.done ? (
                  <span aria-label="satisfied" className="text-score-ready">●</span>
                ) : (
                  <span aria-label="todo" className="opacity-40">○</span>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium">{step.title}</div>
                <p className="text-sm opacity-80 mt-1">{step.detail}</p>
                {step.link && (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline opacity-80 mt-1 inline-block"
                  >
                    {step.link}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Interface matrix */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">What we found</h2>
        <div className="overflow-x-auto border border-black/10 dark:border-white/10 rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04]">
                <th className="text-left px-4 py-2 font-medium">Signal</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Evidence</th>
                <th className="text-right px-4 py-2 font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {foundSignals.map((s) => (
                <SignalRow key={s.key} signal={s} />
              ))}
            </tbody>
          </table>
        </div>
        {missingSignals.length > 0 && (
          <details className="opacity-80">
            <summary className="cursor-pointer text-sm">
              Show {missingSignals.length} signals not present
            </summary>
            <ul className="mt-2 text-sm grid sm:grid-cols-2 gap-x-6 gap-y-1 opacity-70 font-mono">
              {missingSignals.map((s) => (
                <li key={s.key}>
                  · {s.key} <span className="opacity-50">(+{WEIGHTS[s.key] ?? 0} if found)</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* Next steps for the site owner */}
      {profile.recommended_next_steps.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            If you own this site
          </h2>
          <p className="opacity-80">
            Concrete moves that would raise {profile.name ?? profile.domain}&apos;s AgentRank:
          </p>
          <ul className="space-y-1.5 text-sm">
            {profile.recommended_next_steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="opacity-40">→</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  const pos = signal.points >= 0;
  return (
    <tr className="border-t border-black/5 dark:border-white/5">
      <td className="px-4 py-2 font-mono text-xs">{signal.key}</td>
      <td className="px-4 py-2">
        {signal.found ? (
          <span className="text-score-ready">found</span>
        ) : signal.points < 0 ? (
          <span className="text-score-blocked">flagged</span>
        ) : (
          <span className="opacity-50">—</span>
        )}
        {signal.detail && <div className="opacity-70 text-xs mt-0.5">{signal.detail}</div>}
      </td>
      <td className="px-4 py-2">
        {signal.url && (
          <a
            href={signal.url}
            target="_blank"
            rel="noreferrer"
            className="underline opacity-80 font-mono text-xs break-all"
          >
            {signal.url.replace(/^https?:\/\//, "")}
          </a>
        )}
      </td>
      <td className={`px-4 py-2 text-right font-mono ${pos ? "" : "text-score-blocked"}`}>
        {signal.points > 0 ? `+${signal.points}` : signal.points}
      </td>
    </tr>
  );
}
