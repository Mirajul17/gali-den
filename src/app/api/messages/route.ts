import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { detectSlang, worstSeverity } from "@/lib/slang";

const MIN_SECONDS_BETWEEN_POSTS = 4;
const MAX_POSTS_PER_DAY = 300;
const MAX_LENGTH = 280;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const content = (body?.content ?? "").toString().trim();
  const anonId = (body?.anonId ?? "").toString().trim();
  const callsign = body?.callsign ? body.callsign.toString().trim().slice(0, 24) : null;

  if (!anonId) {
    return NextResponse.json({ error: "Missing anonId." }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }
  if (content.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: `Keep it under ${MAX_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  // Rate-limit check and dictionary fetch don't depend on each other,
  // so run them at the same time instead of one after another — this
  // alone cuts a meaningful chunk off the response time.
  const [{ data: rl }, { data: dictionary }] = await Promise.all([
    supabase.from("rate_limits").select("*").eq("anon_id", anonId).maybeSingle(),
    supabase.from("slang_dictionary").select("normalized_term, severity"),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  if (rl) {
    const secondsSinceLast = rl.last_posted_at
      ? (now.getTime() - new Date(rl.last_posted_at).getTime()) / 1000
      : Infinity;

    if (secondsSinceLast < MIN_SECONDS_BETWEEN_POSTS) {
      return NextResponse.json(
        { error: "Slow down a little before posting again." },
        { status: 429 }
      );
    }

    const sameDay = rl.daily_date === today;
    const dailyCount = sameDay ? rl.daily_count : 0;

    if (dailyCount >= MAX_POSTS_PER_DAY) {
      return NextResponse.json(
        { error: "You've hit today's posting limit." },
        { status: 429 }
      );
    }

    // Not awaited: this bookkeeping write doesn't need to finish before
    // we save the actual message and respond to the person waiting.
    supabase
      .from("rate_limits")
      .update({
        last_posted_at: now.toISOString(),
        daily_count: sameDay ? dailyCount + 1 : 1,
        daily_date: today,
      })
      .eq("anon_id", anonId)
      .then(() => {});
  } else {
    supabase
      .from("rate_limits")
      .insert({
        anon_id: anonId,
        last_posted_at: now.toISOString(),
        daily_count: 1,
        daily_date: today,
      })
      .then(() => {});
  }

  // --- Slang detection -------------------------------------------------
  const detected = detectSlang(content, dictionary ?? []);
  const severity = worstSeverity(detected);

  // Severe matches (slurs/hate speech you've tagged as such in the
  // dictionary) never reach the live public panel and never count
  // toward any ranking. They're stored hidden for moderation review.
  const isHidden = severity === "severe";

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      content,
      anon_id: anonId,
      callsign,
      detected_terms: detected.map((d) => d.term),
      severity,
      is_hidden: isHidden,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: isHidden ? null : inserted });
}
