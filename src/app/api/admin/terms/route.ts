import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function checkAuth(req: NextRequest) {
  const header = req.headers.get("x-admin-secret");
  return header && header === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("slang_dictionary")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ terms: data });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const term = (body?.term ?? "").toString().trim().toLowerCase();
  const language = (body?.language ?? "en").toString().trim();
  const severity = body?.severity === "severe" ? "severe" : "mild";

  if (!term) {
    return NextResponse.json({ error: "Missing term." }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("slang_dictionary").insert({
    term,
    normalized_term: term,
    language,
    severity,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = supabaseServer();
  const { error } = await supabase.from("slang_dictionary").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
