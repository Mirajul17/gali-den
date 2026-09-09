"use client";

import { useEffect, useState } from "react";

type Term = {
  id: number;
  term: string;
  language: string;
  severity: "mild" | "severe";
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [terms, setTerms] = useState<Term[]>([]);
  const [newTerm, setNewTerm] = useState("");
  const [newLang, setNewLang] = useState("en");
  const [newSeverity, setNewSeverity] = useState<"mild" | "severe">("mild");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("gali-den:admin-secret");
    if (saved) {
      setSecret(saved);
      unlock(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function unlock(value: string) {
    const res = await fetch("/api/admin/terms", {
      headers: { "x-admin-secret": value },
    });
    if (res.ok) {
      setUnlocked(true);
      sessionStorage.setItem("gali-den:admin-secret", value);
      const body = await res.json();
      setTerms(body.terms);
      setError(null);
    } else {
      setError("Wrong secret.");
    }
  }

  async function addTerm() {
    if (!newTerm.trim()) return;
    const res = await fetch("/api/admin/terms", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ term: newTerm, language: newLang, severity: newSeverity }),
    });
    if (res.ok) {
      setNewTerm("");
      unlock(secret);
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error || "Couldn't add that term.");
    }
  }

  async function removeTerm(id: number) {
    await fetch(`/api/admin/terms?id=${id}`, {
      method: "DELETE",
      headers: { "x-admin-secret": secret },
    });
    unlock(secret);
  }

  if (!unlocked) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="font-display italic text-xl mb-4">Admin</h1>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin secret"
            className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink/40 mb-2"
          />
          {error && <p className="text-xs text-flag mb-2">{error}</p>}
          <button
            onClick={() => unlock(secret)}
            className="w-full rounded-full bg-ink text-white text-sm font-medium py-2"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh px-5 sm:px-10 py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display italic text-xl mb-6">Slang dictionary</h1>

        <div className="rounded-2xl border border-line p-4 mb-8">
          <p className="text-xs text-hush mb-3">
            Add regional or cultural slang terms here (e.g. romanized Bengali/Hindi
            terms). Mark anything that's a slur or targeted hate speech as
            "severe" — those get hidden from the live feed automatically and
            never appear on the leaderboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder="term or short phrase"
              className="flex-1 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink/40"
            />
            <input
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              placeholder="language code"
              className="w-full sm:w-24 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink/40"
            />
            <select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value as "mild" | "severe")}
              className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink/40"
            >
              <option value="mild">mild</option>
              <option value="severe">severe</option>
            </select>
            <button
              onClick={addTerm}
              className="rounded-full bg-ink text-white text-sm font-medium px-4 py-2"
            >
              Add
            </button>
          </div>
          {error && <p className="text-xs text-flag mt-2">{error}</p>}
        </div>

        <ul className="flex flex-col gap-2">
          {terms.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-xl bg-[#f3f3f3] px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{t.term}</span>
                <span className="text-xs text-hush">{t.language}</span>
                <span
                  className={`text-xs ${t.severity === "severe" ? "text-flag" : "text-hush"}`}
                >
                  {t.severity}
                </span>
              </div>
              <button
                onClick={() => removeTerm(t.id)}
                className="text-xs text-hush hover:text-flag"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
