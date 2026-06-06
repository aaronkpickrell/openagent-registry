import { notFound } from "next/navigation";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { readAllProfiles } from "@/lib/cache";
import Leaderboard from "@/components/Leaderboard";

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const all = await readAllProfiles();
  const scoped = all.filter((p) => p.category === category.slug);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-wider opacity-60">Leaderboard</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{category.name}</h1>
        <p className="opacity-80 max-w-2xl">{category.description}</p>
      </section>
      <Leaderboard profiles={scoped} />
    </div>
  );
}
