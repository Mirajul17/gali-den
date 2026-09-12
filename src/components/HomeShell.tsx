"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MessageFeed from "./MessageFeed";
import Composer from "./Composer";
import CallsignModal from "./CallsignModal";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { getAnonId } from "@/lib/anon";

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

export type ReplyTarget = {
  id: string;
  content: string;
  label: string;
};

export default function HomeShell({ initial }: { initial: Msg[] }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(initial);
  // The displayed count is padded with a fixed offset above the real
  // number of connections, so it never reads as "1 online." The real
  // count from Presence still drives it — it just starts higher.
  const ONLINE_COUNT_OFFSET = 3;
  const [onlineCount, setOnlineCount] = useState(1 + ONLINE_COUNT_OFFSET);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  // Live feed: broadcasts new messages to everyone else. Our own posts
  // are added directly in handleSent below, without waiting on this.
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

  // "Who's online right now" via Supabase Presence. Each open tab counts
  // as one — there's no way to dedupe by person without breaking
  // anonymity, so this is "connections right now," not "unique people."
  useEffect(() => {
    const anonId = getAnonId();
    const presence = supabaseBrowser.channel("online-users", {
      config: { presence: { key: anonId + ":" + Math.random().toString(36).slice(2) } },
    });

    presence
      .on("presence", { event: "sync" }, () => {
        const state = presence.presenceState();
        const real = Object.keys(state).length || 1;
        setOnlineCount(real + ONLINE_COUNT_OFFSET);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presence.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabaseBrowser.removeChannel(presence);
    };
  }, []);

  function handleSent(message: Msg) {
    setMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message]
    );
    setReplyTarget(null);
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
            {onlineCount} online
          </span>
          <Link href="/ranking" className="text-xs font-medium text-ink/70 hover:text-ink">
            Rank
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

      <MessageFeed messages={messages} onReply={setReplyTarget} />
      <Composer onSent={handleSent} replyTarget={replyTarget} onCancelReply={() => setReplyTarget(null)} />
      <CallsignModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
