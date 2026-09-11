import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Called once a day by Vercel Cron (see vercel.json), at the moment the
// day rolls over. Order matters here: we compute and freeze the rank
// FIRST, from the messages that are about to disappear, then delete
// those messages. That way the leaderboard survives the wipe and shows
// "yesterday's" numbers all through the next day, instead of resetting
// to zero the instant the messages are gone.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-cron-secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = supabaseServer();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const yesterday = new Date(todayStart);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayDateString = yesterday.toISOString().slice(0, 10);

  // --- 1. Compute the rank from the messages about to be deleted --------
  const { data: messages, error: fetchError } = await supabase
    .from("messages")
    .select("anon_id, callsign, detected_terms")
    .eq("is_hidden", false)
    .lt("created_at", todayStart.toISOString());

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const termCounts = new Map<string, number>();
  const userCounts = new Map<string, { count: number; callsign: string | null }>();

  for (const row of messages ?? []) {
    const terms: string[] = row.detected_terms ?? [];
    for (const term of terms) {
      termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
    }
    if (terms.length > 0) {
      const existing = userCounts.get(row.anon_id);
      userCounts.set(row.anon_id, {
        count: (existing?.count ?? 0) + 1,
        callsign: row.callsign ?? existing?.callsign ?? null,
      });
    }
  }

  const topTerms = Array.from(termCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([term, count]) => ({ term, count }));

  const topUsers = Array.from(userCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([anonId, v]) => ({ anonId, callsign: v.callsign, count: v.count }));

  // --- 2. Freeze that into the single snapshot row -----------------------
  const { error: snapshotError } = await supabase.from("daily_rank_snapshot").upsert({
    id: 1,
    snapshot_date: yesterdayDateString,
    top_terms: topTerms,
    top_users: topUsers,
  });

  if (snapshotError) {
    return NextResponse.json({ error: snapshotError.message }, { status: 500 });
  }

  // --- 3. Now it's safe to delete the day's messages ----------------------
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

  return NextResponse.json({ ok: true, deletedMessages: count ?? 0, snapshotDate: yesterdayDateString });
}
