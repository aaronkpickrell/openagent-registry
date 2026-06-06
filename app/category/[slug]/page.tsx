import Link from "next/link";
import { notFound } from "next/navigation";
import seed from "@/data/seed.json";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { readAllProfiles } from "@/lib/cache";
import type { Profile, SeedEntry } from "@/lib/types";

const SEED = seed as SeedEntry[];

const LABEL_DOT: Record<Profile["label"], string> = {
  "agent-ready": "bg-score-ready",
  "agent-friendly": "bg-score-friendly",
  partial: "bg-score-partial",
  limited: "bg-score-limited",
  unknown: "bg-score-unknown",
  blocked: "bg-score-blocked",
};

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  // Pull cached profiles for this category, sorted.
  const all = await readAllProfiles();
  const scanned = all
    .filter((p) => p.category === category.slug)
    .sort((a, b) => b.score - a.score);

  // Surface seeds we haven't scanned yet so the table is honest about coverage.
  const scannedSet = new Set(scanned.map((p) => p.domain));
  const unscanned = SEED.filter(
    (s) => s.category === category.slug && !scannedSet.has(s.domain),
  );

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-wider opacity-60">Leaderboard</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{category.name}</h1>
        <p className="opacity-80 max-w-2xl">{category.description}</p>
      </section>

      <section>
        {scanned.length === 0 && unscanned.length === 0 && (
          <p className="opacity-70">
            No services in this category yet. Add one via{" "}
            <code className="font-mono text-sm">data/seed.json</code>.
          </p>
        )}

        {scanned.length > 0 && (
          <div className="overflow-x-auto border border-black/10 dark:border-white/10 rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04]">
                  <th className="text-left px-4 py-2 font-medium w-12">#</th>
                  <th className="text-left px-4 py-2 font-medium">Service</th>
                  <th className="text-left px-4 py-2 font-medium">Label</th>
                  <th className="text-right px-4 py-2 font-medium">AgentRank</th>
                </tr>
              </thead>
              <tbody>
                {scanned.map((p, i) => (
                  <tr
                    key={p.domain}
                    className="border-t border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
                  >
                    <td className="px-4 py-2 opacity-50">{i + 1}</td>
                    <td className="px-4 py-2">
                      <Link href={`/${p.domain}`} className="font-medium underline-offset-2 hover:underline">
                        {p.name ?? p.domain}
                      </Link>
                      <div className="opacity-50 font-mono text-xs">{p.domain}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${LABEL_DOT[p.label]}`}
                          aria-hidden
                        />
                        {p.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{p.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {unscanned.length > 0 && (
          <div className="mt-6 text-sm opacity-70">
            <p className="font-medium opacity-80">Seeded but not yet scanned ({unscanned.length}):</p>
            <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs">
              {unscanned.map((s) => (
                <li key={s.domain}>
                  <Link href={`/${s.domain}`} className="underline">
                    {s.domain}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs opacity-60">
              Visit any of these to trigger a live scan.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
