"use client";

const REPORTED_KEY = "gali-den:reported-ids";

function readSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(REPORTED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REPORTED_KEY, JSON.stringify(Array.from(set)));
}

export function getReportedIds(): Set<string> {
  return readSet();
}

export function markReported(id: string) {
  const set = readSet();
  set.add(id);
  writeSet(set);
}

export function hasReported(id: string): boolean {
  return readSet().has(id);
}

// Drops any remembered ids for messages that are no longer on the panel
// (they were deleted by the nightly reset), so this doesn't grow forever.
export function pruneReportedIds(currentMessageIds: string[]) {
  const current = new Set(currentMessageIds);
  const stored = readSet();
  const kept = new Set(Array.from(stored).filter((id) => current.has(id)));
  writeSet(kept);
}
