"use client";

import { useState } from "react";
import { getAnonId, getCallsign } from "@/lib/anon";

const MAX_LENGTH = 280;

export default function Composer() {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const content = value.trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        anonId: getAnonId(),
        callsign: getCallsign(),
      }),
    }).catch(() => null);

    setSending(false);

    if (!res || !res.ok) {
      const body = await res?.json().catch(() => null);
      setError(body?.error || "Couldn't send that. Try again.");
      return;
    }

    setValue("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="border-t border-line bg-paper/90 backdrop-blur px-5 sm:px-10 py-4">
      <div className="mx-auto max-w-xl">
        {error && <p className="text-xs text-flag mb-2">{error}</p>}
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-white px-3 py-2 focus-within:border-ink/40 transition-colors">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Say something..."
            className="flex-1 resize-none bg-transparent outline-none text-[15px] leading-snug py-1.5 placeholder:text-hush max-h-32"
          />
          <button
            onClick={send}
            disabled={!value.trim() || sending}
            className="shrink-0 rounded-full bg-ink text-white text-sm font-medium px-4 py-2 disabled:opacity-30 transition-opacity"
          >
            Send
          </button>
        </div>
        <div className="flex justify-between mt-1.5 px-1">
          <span className="text-[11px] text-hush">Posted anonymously, live to everyone</span>
          <span className="text-[11px] text-hush">
            {value.length}/{MAX_LENGTH}
          </span>
        </div>
      </div>
    </div>
  );
}
