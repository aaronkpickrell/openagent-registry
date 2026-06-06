import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenAgent Registry — agent-ready scanner and leaderboard",
  description:
    "Scan any site for the full stack of agent-access signals (llms.txt, agents.txt, A2A, MCP, OpenAPI, robots.txt + Content Signals, OAuth, RSL). Get a score, a category rank, and a concrete approval-path checklist.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <header className="border-b border-black/10 dark:border-white/10">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="font-mono text-sm tracking-tight">
              OpenAgent<span className="opacity-50">/Registry</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/leaderboard" className="opacity-80 hover:opacity-100">
                Leaderboard
              </Link>
              <Link href="/category/rentals" className="opacity-80 hover:opacity-100">
                Categories
              </Link>
              <Link href="/about" className="opacity-80 hover:opacity-100">
                About
              </Link>
              <a
                href="https://github.com/aaronkpickrell/openagent-registry"
                className="opacity-80 hover:opacity-100"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
        <footer className="border-t border-black/10 dark:border-white/10 mt-20">
          <div className="mx-auto max-w-5xl px-4 py-6 text-xs opacity-60 flex justify-between">
            <span>Apache 2.0 · open source · community-owned</span>
            <span>
              Lead with the <em>checklist</em>; the score is evidence.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
