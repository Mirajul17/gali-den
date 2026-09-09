import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Called once a day by Vercel Cron (see vercel.json). Deletes every
// message from before today so the leaderboard is always "today only"
// and the messages table never grows unbounded. Rate-limit counters
// are also rolled over.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-cron-secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = supabaseServer();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { error: deleteError, count } = await supabase
    .from("messages")
    .delete({ count: "exact" })
    .lt("created_at", todayStart.toISOString());

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Reset daily posting counters too, so limits don't carry over.
  await supabase
    .from("rate_limits")
    .update({ daily_count: 0, daily_date: todayStart.toISOString().slice(0, 10) })
    .lt("daily_date", todayStart.toISOString().slice(0, 10));

  return NextResponse.json({ ok: true, deletedMessages: count ?? 0 });
}
