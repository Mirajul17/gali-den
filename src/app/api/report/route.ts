import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const AUTO_HIDE_AFTER_REPORTS = 5;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const messageId = (body?.messageId ?? "").toString();

  if (!messageId) {
    return NextResponse.json({ error: "Missing messageId." }, { status: 400 });
  }

  const supabase = supabaseServer();

  await supabase.from("reports").insert({ message_id: messageId });

  const { data: msg } = await supabase
    .from("messages")
    .select("report_count")
    .eq("id", messageId)
    .maybeSingle();

  const newCount = (msg?.report_count ?? 0) + 1;

  await supabase
    .from("messages")
    .update({
      report_count: newCount,
      is_hidden: newCount >= AUTO_HIDE_AFTER_REPORTS ? true : undefined,
    })
    .eq("id", messageId);

  return NextResponse.json({ ok: true });
}
