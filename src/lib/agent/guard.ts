/**
 * Last line of defence on the "never quote a price" rule.
 *
 * The system prompt is the primary control; this catches the case where the
 * model ignores it under pressure ("just give me a rough idea"). Prompts drift,
 * models get swapped — a wrong number sent to a buyer at 3am does not get
 * un-sent, so the rule is enforced in code too.
 */

const CURRENCY_SYMBOL = /[$€£¥₦₹﷼]/;

const CURRENCY_WORD =
  /\b(usd|aed|eur|gbp|sar|qar|omr|kwd|bhd|jpy|cny|inr|ngn|kes|ksh|zar|tzs|ugx|ghs|xof|xaf|dhs|dirhams?|dollars?|euros?|pounds?|yen|yuan|rupees?|riyals?|dinars?|naira|rand|cedis?|shillings?|francs?)\b/i;

const NUMBER_WORD =
  /\b(hundred|thousand|k|lakh|million|fifty|sixty|seventy|eighty|ninety|hundreds|thousands)\b/i;

/** "price is 400", "costs 400", "rate: 400", "sell it at 400" */
const PRICED_STATEMENT =
  /\b(price|prices|priced|pricing|cost|costs|rate|rates|charge|charges|quote|quoted|sell(?:ing)?\s+(?:it|them|at)|per\s+(?:unit|piece|engine|pc))\b[^.\n]{0,20}?\d/i;

/** Things that look like money but are not: refs, specs, phones, quantities, percentages. */
const SAFE_PATTERNS: RegExp[] = [
  /\bJDM-\d{3}\b/gi, // listing reference
  /\b\d+(?:\.\d+)?\s?[lL]\b/g, // displacement, 2.5L
  /\b\d+\s?%/g, // the shipping discount
  /\+?\d{1,3}[\s-]?\d{2,3}[\s-]?\d{3}[\s-]?\d{3,4}/g, // phone numbers
  /\b(19|20)\d{2}\b/g, // model years
  /\b\d+\s?(?:units?|pcs?|pieces?|engines?|gearboxes?|cars?|containers?|sets?|cbm|ft|feet)\b/gi,
  /\b\d+\s?(?:v\d|valve|cylinder|door|seater|speed)\b/gi, // V4, 16 valve
];

function stripSafeNumbers(text: string): string {
  let out = text;
  for (const pattern of SAFE_PATTERNS) out = out.replace(pattern, " ");
  return out;
}

/**
 * True when the message appears to quote money. Deliberately biased toward
 * false positives: a needlessly withheld sentence costs a retry, a leaked
 * price costs a deal.
 */
export function containsPriceQuote(text: string): boolean {
  const scrubbed = stripSafeNumbers(text);

  // A currency symbol next to a digit is unambiguous.
  if (/[$€£¥₦₹﷼]\s*\d/.test(scrubbed) || /\d\s*[$€£¥₦₹﷼]/.test(scrubbed)) return true;

  // A currency word within striking distance of a number.
  const currency = CURRENCY_WORD.exec(scrubbed);
  if (currency) {
    const at = currency.index;
    const window = scrubbed.slice(Math.max(0, at - 24), at + currency[0].length + 24);
    if (/\d/.test(window) || NUMBER_WORD.test(window)) return true;
  }

  if (PRICED_STATEMENT.test(scrubbed)) return true;

  // A bare symbol with a spelled-out amount: "$ five hundred".
  if (CURRENCY_SYMBOL.test(scrubbed) && NUMBER_WORD.test(scrubbed)) return true;

  return false;
}

/** Used when a retry still trips the guard. Safe in any conversation. */
export const SAFE_PRICE_FALLBACK =
  "For pricing I'll get our sales team to message you directly, they have today's numbers. Meanwhile, which port are you shipping to?";
