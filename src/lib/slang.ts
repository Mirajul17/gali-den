export type DictEntry = {
  normalized_term: string;
  severity: "mild" | "severe";
};

export type DetectedTerm = {
  term: string;
  severity: "mild" | "severe";
};

// Normalizes text the same way terms are normalized when stored, so
// "LOL!!" and "lol" both match the dictionary entry "lol".
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Matches both single-word slang ("bruh") and short multi-word phrases
// ("no cap") by checking every 1-, 2-, and 3-word window in the message
// against the dictionary. This is a plain lookup against curated,
// moderator-approved terms — not a guess based on "unusual" words —
// which is what keeps the leaderboard meaningful and hard to game.
export function detectSlang(
  content: string,
  dictionary: DictEntry[]
): DetectedTerm[] {
  const dictMap = new Map(dictionary.map((d) => [d.normalized_term, d.severity]));
  const normalized = normalize(content);
  const words = normalized.split(" ").filter(Boolean);

  const found = new Map<string, "mild" | "severe">();

  for (let windowSize = 1; windowSize <= 3; windowSize++) {
    for (let i = 0; i + windowSize <= words.length; i++) {
      const phrase = words.slice(i, i + windowSize).join(" ");
      const severity = dictMap.get(phrase);
      if (severity) {
        found.set(phrase, severity);
      }
    }
  }

  return Array.from(found.entries()).map(([term, severity]) => ({
    term,
    severity,
  }));
}

export function worstSeverity(terms: DetectedTerm[]): "none" | "mild" | "severe" {
  if (terms.some((t) => t.severity === "severe")) return "severe";
  if (terms.length > 0) return "mild";
  return "none";
}
