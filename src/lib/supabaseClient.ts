"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client: read-only in practice, since RLS only grants
// SELECT on visible messages to the anon key. Used for the live
// realtime subscription that powers the shared panel.
export const supabaseBrowser = createClient(url, anonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});
