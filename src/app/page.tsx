import { supabaseServer } from "@/lib/supabaseServer";
import HomeShell from "@/components/HomeShell";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = supabaseServer();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("messages")
    .select("id, content, anon_id, callsign, created_at, detected_terms, reply_preview_content, reply_preview_label")
    .eq("is_hidden", false)
    .gte("created_at", todayStart.toISOString())
    .order("created_at", { ascending: true })
    .limit(200);

  return <HomeShell initial={data ?? []} />;
}
