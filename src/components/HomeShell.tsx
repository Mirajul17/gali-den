"use client";

import { useState } from "react";
import Link from "next/link";
import MessageFeed from "./MessageFeed";
import Composer from "./Composer";
import CallsignModal from "./CallsignModal";

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

      <MessageFeed initial={initial} />
      <Composer />
      <CallsignModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
