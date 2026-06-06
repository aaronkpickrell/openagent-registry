"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function normalize(input: string): string | null {
    let s = input.trim().toLowerCase();
    if (!s) return null;
    s = s.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(s)) return null;
    return s;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const domain = normalize(value);
    if (!domain) return;
    router.push(`/${encodeURIComponent(domain)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2 max-w-xl">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter a domain — e.g. stripe.com"
        className="flex-1 rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-base outline-none focus:border-black/60 dark:focus:border-white/60"
        autoFocus
      />
      <button
        type="submit"
        className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium bg-black text-white dark:bg-white dark:text-black"
      >
        Scan
      </button>
    </form>
  );
}
