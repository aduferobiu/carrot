// Turns a messy raw bank narration into a string keywords can reliably match
// against. Digit runs of 4+ (not whole alphanumeric tokens) are stripped, so
// merchant names concatenated with a phone number or account number — a
// common pattern in Nigerian bank narrations, e.g. `MTN0803XXXXXXX` — keep
// the merchant name intact instead of losing the whole token.
const CHANNEL_PREFIX = /^(nip|ussd|pos|web|mob|atm)\//;
const NON_ALPHANUMERIC = /[^a-z0-9\s]/g;
const LONG_DIGIT_RUN = /\d{4,}/g;
// A trailing short number is almost always an auto-incrementing transfer
// counter (e.g. Kuda's "KUDA/SAMUEL OLAMIDE/TRANSFER 56"), not part of the
// merchant/counterparty name — strip it so repeat transfers to/from the same
// person normalize identically (the sender/receiver name becomes the stable
// part of the string). Without this, "...TRANSFER 56", "...57", "...58" each
// produce a different normalized_description and rule-learning (which keys
// off exact repeats) never accumulates enough matching corrections to
// promote a rule.
const TRAILING_SHORT_NUMBER = /\s+\d{1,3}$/;
const WHITESPACE = /\s+/g;
const MAX_LENGTH = 500;

export function normalize(rawDescription: string | null | undefined): string {
  if (!rawDescription) return "";

  let desc = rawDescription.slice(0, MAX_LENGTH).toLowerCase();
  desc = desc.replace(CHANNEL_PREFIX, "");
  desc = desc.replace(NON_ALPHANUMERIC, " ");
  desc = desc.replace(LONG_DIGIT_RUN, " ");
  desc = desc.replace(WHITESPACE, " ").trim();
  desc = desc.replace(TRAILING_SHORT_NUMBER, "").trim();

  return desc;
}
