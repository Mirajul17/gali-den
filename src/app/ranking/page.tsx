"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RankData = {
  topTerms: { term: string; count: number }[];
  topUsers: { anonId: string; callsign: string | null; count: number }[];
  resetsAt: string;
};

function shortAnonLabel(anonId: string) {
  return "Anon#" + anonId.replace(/-/g, "").slice(0, 4).toUpperCase();
}

const MEDALS = ["1st", "2nd", "3rd"];

export default function RankingPage() {
  const [data, setData] = useState<RankData | null>(null);

  async function load() {
    const res = await fetch("/api/rank", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-5 sm:px-10 py-4 border-b border-line">
        <h1 className="font-display italic text-xl tracking-tight">Today's rank</h1>
        <Link href="/" className="text-xs font-medium text-ink/70 hover:text-ink">
          Back to feed
        </Link>
      </header>

      <main className="flex-1 px-5 sm:px-10 py-10">
        <div className="mx-auto max-w-xl flex flex-col gap-12">
          <section>
            <h2 className="text-sm font-medium text-hush mb-4">Most used slang</h2>
            <ol className="flex flex-col gap-3">
              {(data?.topTerms ?? []).length === 0 && (
                <li className="text-sm text-hush">Nothing ranked yet today.</li>
              )}
              {data?.topTerms.map((t, i) => (
                <li
                  key={t.term}
                  className="flex items-center justify-between rounded-2xl bg-[#f3f3f3] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-hush w-8">{MEDALS[i]}</span>
                    <span className="font-display italic text-lg">{t.term}</span>
                  </div>
                  <span className="text-xs text-hush">{t.count} uses</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-sm font-medium text-hush mb-4">Most active today</h2>
            <ol className="flex flex-col gap-3">
              {(data?.topUsers ?? []).length === 0 && (
                <li className="text-sm text-hush">No activity yet today.</li>
              )}
              {data?.topUsers.map((u, i) => (
                <li
                  key={u.anonId}
                  className="flex items-center justify-between rounded-2xl bg-[#f3f3f3] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-hush w-8">{MEDALS[i]}</span>
                    <span className="font-medium text-sm">
                      {u.callsign || shortAnonLabel(u.anonId)}
                    </span>
                  </div>
                  <span className="text-xs text-hush">{u.count} posts</span>
                </li>
              ))}
            </ol>
          </section>

          <p className="text-xs text-hush text-center">
            {data?.resetsAt ?? "Resets daily at 00:00 UTC"} — yesterday's board is cleared, not archived.
          </p>
        </div>
      </main>
    </div>
  );
}
