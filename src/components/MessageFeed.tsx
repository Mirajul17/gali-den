"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getAnonId, shortAnonLabel } from "@/lib/anon";
import { hasReported, markReported, pruneReportedIds } from "@/lib/reportedIds";
import type { ReplyTarget } from "./HomeShell";

type Msg = {
  id: string;
  content: string;
  anon_id: string;
  callsign: string | null;
  created_at: string;
  detected_terms: string[];
  reply_preview_content?: string | null;
  reply_preview_label?: string | null;
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageFeed({
  messages,
  onReply,
}: {
  messages: Msg[];
  onReply: (target: ReplyTarget) => void;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [reportedTick, setReportedTick] = useState(0); // bump to force re-render after marking reported
  const myAnonId = typeof window !== "undefined" ? getAnonId() : "";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // Drop remembered "reported" ids for messages that no longer exist
  // (deleted by the nightly reset) so local storage doesn't grow forever.
  useEffect(() => {
    pruneReportedIds(messages.map((m) => m.id));
  }, [messages]);

  async function report(id: string) {
    if (hasReported(id)) return;
    markReported(id); // persists across refresh, and blocks reporting it again
    setReportedTick((t) => t + 1);
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
          {messages.map((m) => {
            const isMine = m.anon_id === myAnonId;
            const reported = hasReported(m.id);
            const label = m.callsign || shortAnonLabel(m.anon_id);

            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 28, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className={`group relative flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                <div className="flex items-baseline gap-2 mb-0.5 px-1">
                  <span className="text-xs font-medium text-ink/70">
                    {isMine ? "You" : label}
                  </span>
                  <span className="text-[11px] text-hush">{timeLabel(m.created_at)}</span>
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug ${
                    isMine ? "bg-ink text-white" : "bg-[#f3f3f3] text-ink"
                  }`}
                >
                  {m.reply_preview_content && (
                    <div
                      className={`mb-1.5 rounded-lg px-2.5 py-1.5 text-[13px] border-l-2 ${
                        isMine
                          ? "border-white/40 bg-white/10 text-white/80"
                          : "border-ink/20 bg-black/5 text-ink/60"
                      }`}
                    >
                      <span className="font-medium">{m.reply_preview_label}: </span>
                      {m.reply_preview_content}
                    </div>
                  )}
                  {m.content}
                </div>

                <div className="flex gap-3 mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() =>
                      onReply({ id: m.id, content: m.content, label: isMine ? "You" : label })
                    }
                    className="text-[11px] text-hush hover:text-ink"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => report(m.id)}
                    disabled={reported}
                    className="text-[11px] text-hush hover:text-flag disabled:opacity-100 disabled:hover:text-hush"
                  >
                    {reported ? "Reported" : "Report"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
