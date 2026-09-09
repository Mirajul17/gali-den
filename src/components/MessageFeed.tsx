"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { shortAnonLabel } from "@/lib/anon";

type Msg = {
  id: string;
  content: string;
  anon_id: string;
  callsign: string | null;
  created_at: string;
  detected_terms: string[];
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageFeed({ initial }: { initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabaseBrowser
      .channel("messages-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as Msg & { is_hidden: boolean };
          if (row.is_hidden) return; // severe matches never reach the panel
          setMessages((prev) => [...prev, row]);
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function report(id: string) {
    if (reportedIds.has(id)) return;
    setReportedIds((prev) => new Set(prev).add(id));
    await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: id }),
    }).catch(() => {});
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-5 sm:px-10 py-6">
      <div className="mx-auto max-w-xl flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-hush text-sm text-center pt-16">
            Nothing said yet today. Be the first.
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="group relative"
            >
              <div className="flex items-baseline gap-2 mb-0.5 px-1">
                <span className="text-xs font-medium text-ink/70">
                  {m.callsign || shortAnonLabel(m.anon_id)}
                </span>
                <span className="text-[11px] text-hush">{timeLabel(m.created_at)}</span>
              </div>
              <div className="inline-block max-w-full rounded-2xl bg-[#f3f3f3] px-4 py-2.5 text-[15px] leading-snug text-ink">
                {m.content}
              </div>
              <button
                onClick={() => report(m.id)}
                disabled={reportedIds.has(m.id)}
                className="ml-2 align-middle text-[11px] text-hush opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
              >
                {reportedIds.has(m.id) ? "Reported" : "Report"}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
