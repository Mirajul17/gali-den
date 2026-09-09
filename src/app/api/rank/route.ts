import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseServer();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: messages, error } = await supabase
    .from("messages")
    .select("anon_id, callsign, detected_terms")
    .eq("is_hidden", false)
    .gte("created_at", todayStart.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Top 3 slang terms used today
  const termCounts = new Map<string, number>();
  // Top 3 posters today (by count of slang-containing messages)
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
    .map(([anonId, v]) => ({
      anonId,
      callsign: v.callsign,
      count: v.count,
    }));

  return NextResponse.json({
    topTerms,
    topUsers,
    resetsAt: "Daily at 00:00 UTC",
  });
}
