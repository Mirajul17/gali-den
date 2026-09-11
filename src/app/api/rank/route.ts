import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// This no longer computes anything live — it just reads the single
// snapshot row that the nightly cron job (/api/cron/reset) freezes right
// before deleting the day's messages. That's what makes the board show
// "yesterday's" rank and hold steady all day instead of resetting to
// zero the moment the messages are cleared.
export async function GET() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("daily_rank_snapshot")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    topTerms: data?.top_terms ?? [],
    topUsers: data?.top_users ?? [],
    snapshotDate: data?.snapshot_date ?? null,
  });
}
