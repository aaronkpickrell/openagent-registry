import { readAllProfiles } from "@/lib/cache";
import Leaderboard from "@/components/Leaderboard";

export const dynamic = "force-dynamic";

export default async function GlobalLeaderboardPage() {
  const all = await readAllProfiles();
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-wider opacity-60">Leaderboard</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">All services</h1>
        <p className="opacity-80 max-w-2xl">
          Every scanned service across every category, ranked by AgentRank. Filter by status,
          category, or the signals you require - and sort however you want.
        </p>
      </section>
      <Leaderboard profiles={all} showCategoryFilter />
    </div>
  );
}
