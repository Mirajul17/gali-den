// Best-effort filter for links, phone numbers, and address-like text.
// Links are reliably detectable. Phone numbers catch most casual attempts
// but can be dodged with deliberate obfuscation. Addresses have no strong
// pattern in free text, so this only catches the more obvious cases
// (a number next to a street-type word) — it's a deterrent, not a
// guarantee. See README for the tradeoffs.

const URL_PATTERN =
  /(https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+\.(com|net|org|io|co|xyz|info|biz|me|link|app|dev|gg|bd|in)\b(\/[^\s]*)?/i;

// Matches sequences that look like phone numbers: 7+ digits, optionally
// separated by spaces, dashes, dots, or wrapped in parentheses, with an
// optional leading +.
const PHONE_PATTERN = /(\+?\d[\d\s().-]{6,}\d)/;

const ADDRESS_KEYWORDS =
  /\b(street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?|block|sector|floor|flat|apt|apartment|house\s*no|building)\b/i;
const HAS_DIGIT = /\d/;

export type FilterResult = {
  blocked: boolean;
  reason?: string;
};

export function checkBlockedContent(content: string): FilterResult {
  if (URL_PATTERN.test(content)) {
    return { blocked: true, reason: "Links aren't allowed here." };
  }

  if (PHONE_PATTERN.test(content)) {
    return { blocked: true, reason: "Phone numbers aren't allowed here." };
  }

  if (ADDRESS_KEYWORDS.test(content) && HAS_DIGIT.test(content)) {
    return { blocked: true, reason: "Addresses aren't allowed here." };
  }

  return { blocked: false };
}
