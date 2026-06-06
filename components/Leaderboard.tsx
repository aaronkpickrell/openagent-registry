"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Profile, ScoreLabel, SignalKey, CategorySlug } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";

const LABEL_DOT: Record<ScoreLabel, string> = {
  "agent-ready": "bg-score-ready",
  "agent-friendly": "bg-score-friendly",
  partial: "bg-score-partial",
  limited: "bg-score-limited",
  unknown: "bg-score-unknown",
  blocked: "bg-score-blocked",
};

const LABEL_TONE: Record<ScoreLabel, string> = {
  "agent-ready": "text-score-ready",
  "agent-friendly": "text-score-friendly",
  partial: "text-score-partial",
  limited: "text-score-limited",
  unknown: "text-score-unknown",
  blocked: "text-score-blocked",
};

const LABELS: ScoreLabel[] = [
  "agent-ready",
  "agent-friendly",
  "partial",
  "limited",
  "unknown",
  "blocked",
];

interface FilterableSignal {
  key: SignalKey;
  label: string;
}

const FILTERABLE_SIGNALS: FilterableSignal[] = [
  { key: "llms_txt", label: "llms.txt" },
  { key: "agents_txt", label: "agents.txt" },
  { key: "agents_json", label: "agents.json" },
  { key: "a2a_agent_card", label: "A2A agent-card" },
  { key: "openapi", label: "OpenAPI" },
  { key: "oauth_discovery", label: "OAuth discovery" },
  { key: "agents_md", label: "AGENTS.md" },
];

type SortKey = "score-desc" | "score-asc" | "name" | "recent";

interface Props {
  profiles: Profile[];
  showCategoryFilter?: boolean;
}

export default function Leaderboard({ profiles, showCategoryFilter = false }: Props) {
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState<Set<ScoreLabel>>(new Set());
  const [signalFilter, setSignalFilter] = useState<Set<SignalKey>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<Set<CategorySlug>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("score-desc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = profiles.filter((p) => {
      if (labelFilter.size > 0 && !labelFilter.has(p.label)) return false;
      if (
        categoryFilter.size > 0 &&
        (!p.category || !categoryFilter.has(p.category))
      ) {
        return false;
      }
      if (signalFilter.size > 0) {
        const haveAll = [...signalFilter].every((sk) =>
          p.signals.some((s) => s.key === sk && s.found),
        );
        if (!haveAll) return false;
      }
      if (q) {
        const hay = `${p.name ?? ""} ${p.domain}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    switch (sortKey) {
      case "score-desc":
        list = [...list].sort((a, b) => b.score - a.score);
        break;
      case "score-asc":
        list = [...list].sort((a, b) => a.score - b.score);
        break;
      case "name":
        list = [...list].sort((a, b) =>
          (a.name ?? a.domain).localeCompare(b.name ?? b.domain),
        );
        break;
      case "recent":
        list = [...list].sort(
          (a, b) => +new Date(b.scanned_at) - +new Date(a.scanned_at),
        );
        break;
    }
    return list;
  }, [profiles, search, labelFilter, signalFilter, categoryFilter, sortKey]);

  function toggle<T>(set: Set<T>, value: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  const total = profiles.length;
  const shown = filtered.length;

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="space-y-4 border border-black/10 dark:border-white/10 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or domain…"
            className="flex-1 min-w-[200px] rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/60 dark:focus:border-white/60"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
          >
            <option value="score-desc">Sort: AgentRank (high → low)</option>
            <option value="score-asc">Sort: AgentRank (low → high)</option>
            <option value="name">Sort: Name (A → Z)</option>
            <option value="recent">Sort: Most recently scanned</option>
          </select>
        </div>

        <FilterRow label="Status">
          {LABELS.map((l) => {
            const active = labelFilter.has(l);
            return (
              <Chip
                key={l}
                active={active}
                onClick={() => toggle(labelFilter, l, setLabelFilter)}
              >
                <span className={`inline-block w-2 h-2 rounded-full ${LABEL_DOT[l]} mr-1.5`} />
                {l}
              </Chip>
            );
          })}
        </FilterRow>

        <FilterRow label="Has signal">
          {FILTERABLE_SIGNALS.map((s) => {
            const active = signalFilter.has(s.key);
            return (
              <Chip
                key={s.key}
                active={active}
                onClick={() => toggle(signalFilter, s.key, setSignalFilter)}
              >
                {s.label}
              </Chip>
            );
          })}
        </FilterRow>

        {showCategoryFilter && (
          <FilterRow label="Category">
            {CATEGORIES.map((c) => {
              const active = categoryFilter.has(c.slug);
              return (
                <Chip
                  key={c.slug}
                  active={active}
                  onClick={() => toggle(categoryFilter, c.slug, setCategoryFilter)}
                >
                  {c.name}
                </Chip>
              );
            })}
          </FilterRow>
        )}

        <div className="flex justify-between text-xs opacity-60">
          <span>
            Showing {shown} of {total}
          </span>
          {(search ||
            labelFilter.size > 0 ||
            signalFilter.size > 0 ||
            categoryFilter.size > 0) && (
            <button
              onClick={() => {
                setSearch("");
                setLabelFilter(new Set());
                setSignalFilter(new Set());
                setCategoryFilter(new Set());
              }}
              className="underline hover:no-underline"
            >
              clear filters
            </button>
          )}
        </div>
      </div>

      {/* Leaderboard table */}
      {filtered.length === 0 ? (
        <p className="opacity-70 text-center py-8">
          No services match. Loosen filters or try a different search.
        </p>
      ) : (
        <div className="overflow-x-auto border border-black/10 dark:border-white/10 rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04]">
                <th className="text-left px-4 py-2 font-medium w-12">#</th>
                <th className="text-left px-4 py-2 font-medium">Service</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Signals</th>
                <th className="text-right px-4 py-2 font-medium">AgentRank</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <Row key={p.domain} profile={p} rank={i + 1} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs uppercase tracking-wider opacity-50 w-20 flex-shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
          : "border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ profile, rank }: { profile: Profile; rank: number }) {
  const presentSignals = profile.signals.filter((s) => s.found);
  const headlineSignals = presentSignals
    .filter((s) =>
      [
        "a2a_agent_card",
        "agents_json",
        "agents_txt",
        "openapi",
        "oauth_discovery",
        "llms_txt",
        "agents_md",
        "mcp_registry",
        "content_signals",
        "blocked_by_bot_management",
        "blocks_automation",
      ].includes(s.key),
    )
    .slice(0, 5);
  const scoreClass =
    profile.score >= 60
      ? "text-score-friendly"
      : profile.score >= 40
        ? "text-score-partial"
        : profile.score < 0
          ? "text-score-blocked"
          : "opacity-70";

  return (
    <tr className="border-t border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.04]">
      <td className="px-4 py-3 opacity-50 align-top">{rank}</td>
      <td className="px-4 py-3 align-top">
        <Link href={`/${profile.domain}`} className="font-medium underline-offset-2 hover:underline">
          {profile.name ?? profile.domain}
        </Link>
        <div className="opacity-50 font-mono text-xs">{profile.domain}</div>
      </td>
      <td className="px-4 py-3 align-top">
        <span className={`inline-flex items-center gap-2 text-xs ${LABEL_TONE[profile.label]}`}>
          <span className={`inline-block w-2 h-2 rounded-full ${LABEL_DOT[profile.label]}`} aria-hidden />
          {profile.label}
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-wrap gap-1">
          {headlineSignals.map((s) => (
            <span
              key={s.key}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm border ${
                s.points < 0
                  ? "border-score-blocked/40 text-score-blocked"
                  : "border-black/15 dark:border-white/20 opacity-80"
              }`}
              title={s.detail ?? s.key}
            >
              {s.key.replace(/_/g, " ")}
            </span>
          ))}
          {headlineSignals.length === 0 && (
            <span className="text-xs opacity-50">—</span>
          )}
        </div>
      </td>
      <td className={`px-4 py-3 text-right font-mono text-2xl font-semibold align-top ${scoreClass}`}>
        {profile.score > 0 ? `+${profile.score}` : profile.score}
      </td>
    </tr>
  );
}
