"use client";

const ANON_ID_KEY = "gali-den:anon-id";
const CALLSIGN_KEY = "gali-den:callsign";

// A random per-device id, generated once and kept in localStorage.
// It is never linked to a real name, email, or IP on the client side.
// It only exists so the daily leaderboard can group "the same poster"
// together. Clearing site data resets it, by design.
export function getAnonId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

export function shortAnonLabel(anonId: string): string {
  return "Anon#" + anonId.replace(/-/g, "").slice(0, 4).toUpperCase();
}

// Optional display name. Purely cosmetic and only stored locally +
// attached to messages the user sends going forward — it is never
// required, and posting anonymously stays the default.
export function getCallsign(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CALLSIGN_KEY);
}

export function setCallsign(value: string | null) {
  if (typeof window === "undefined") return;
  if (!value || !value.trim()) {
    window.localStorage.removeItem(CALLSIGN_KEY);
  } else {
    window.localStorage.setItem(CALLSIGN_KEY, value.trim().slice(0, 24));
  }
}
