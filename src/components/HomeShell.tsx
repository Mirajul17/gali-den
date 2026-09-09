"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MessageFeed from "./MessageFeed";
import Composer from "./Composer";
import CallsignModal from "./CallsignModal";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Msg = {
  id: string;
  content: string;
  anon_id: string;
  callsign: string | null;
  created_at: string;
  detected_terms: string[];
};

export default function HomeShell({ initial }: { initial: Msg[] }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(initial);

  // The live channel still runs so everyone ELSE sees new posts in real
  // time. For the person actually sending, we don't wait on this at all
  // (see handleSent below) — this only adds messages we don't already have.
  useEffect(() => {
    const channel = supabaseBrowser
      .channel("messages-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as Msg & { is_hidden: boolean };
          if (row.is_hidden) return;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row]
          );
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  // Called the moment our own POST /api/messages confirms the save —
  // no need to wait for it to round-trip back through the realtime
  // channel too. The dedupe check above stops it from being added twice
  // if the broadcast also arrives a moment later.
  function handleSent(message: Msg) {
    setMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message]
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between px-5 sm:px-10 py-4 border-b border-line">
        <h1 className="font-display italic text-xl tracking-tight">Gali Den</h1>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-hush">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-flag opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-flag" />
            </span>
            live
          </span>
          <Link href="/ranking" className="text-xs font-medium text-ink/70 hover:text-ink">
            Today's rank
          </Link>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Callsign settings"
            className="text-xs font-medium text-ink/70 hover:text-ink"
          >
            Callsign
          </button>
        </div>
      </header>

      <MessageFeed messages={messages} />
      <Composer onSent={handleSent} />
      <CallsignModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
