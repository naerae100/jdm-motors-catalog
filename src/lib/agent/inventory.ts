import { listings, type Listing } from "@/data/listings";
import type { ListingMatch } from "./types";

/**
 * Free-text inventory search tuned for how buyers actually message on WhatsApp:
 * "u have 4d56?", "looking for hilux engine", "nissan diesel half cut".
 *
 * The structured columns are thin — 23% of rows have no engine code and 33% no
 * fuel — so `caption` carries most of the signal (it is where TRITON, HILUX and
 * turbo details live). Scoring weights it accordingly.
 */

/** Chat filler and words that appear in nearly every caption. Neither narrows anything. */
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "i",
  "we",
  "you",
  "u",
  "do",
  "does",
  "did",
  "is",
  "are",
  "am",
  "have",
  "has",
  "got",
  "any",
  "some",
  "need",
  "want",
  "looking",
  "look",
  "for",
  "me",
  "my",
  "please",
  "pls",
  "plz",
  "hi",
  "hello",
  "hey",
  "sir",
  "bro",
  "boss",
  "can",
  "could",
  "would",
  "will",
  "send",
  "show",
  "give",
  "tell",
  "know",
  "get",
  "available",
  "stock",
  "in",
  "of",
  "on",
  "at",
  "to",
  "and",
  "or",
  "with",
  "it",
  "this",
  "that",
  "there",
  "what",
  "which",
  "how",
  "much",
  "many",
  "price",
  "cost",
  "quote",
  "quotation",
  "buy",
  "order",
  "ok",
  "okay",
  "yes",
  "no",
  "thanks",
  "thank",
]);

/** Words that name a product line rather than narrow within one. */
const CATEGORY_WORDS: Record<string, string> = {
  engine: "Engine",
  engines: "Engine",
  motor: "Engine",
  gearbox: "Gearbox",
  gearboxes: "Gearbox",
  transmission: "Gearbox",
  halfcut: "Half Cut",
  "half-cut": "Half Cut",
  nosecut: "Half Cut",
  car: "Complete Car",
  cars: "Complete Car",
  vehicle: "Complete Car",
};

const FUEL_WORDS: Record<string, string> = {
  diesel: "Diesel",
  petrol: "Petrol",
  gasoline: "Petrol",
  gas: "Petrol",
  benzine: "Petrol",
};

/** Strip punctuation so "4D56-U", "4d56u" and "4D56 U" all collapse together. */
function squash(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9.-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function scoreListing(listing: Listing, tokens: string[]): number {
  const code = squash(listing.code);
  const make = listing.make.toLowerCase();
  const caption = listing.caption.toLowerCase();
  const haystack =
    `${listing.make} ${listing.code} ${listing.displacement} ${listing.category} ${listing.fuel} ${listing.caption}`.toLowerCase();

  let score = 0;

  for (const token of tokens) {
    const squashed = squash(token);

    // Engine code is the highest-confidence signal a buyer can give.
    if (code.length > 0 && squashed.length > 1) {
      if (code === squashed) {
        score += 120;
        continue;
      }
      if (code.startsWith(squashed) || squashed.startsWith(code)) {
        score += 45;
        continue;
      }
    }

    if (make === token) {
      score += 50;
      continue;
    }

    // Vehicle names (TRITON, HILUX) only ever appear in the caption.
    if (new RegExp(`\\b${escapeRegex(token)}\\b`).test(caption)) {
      score += 30;
      continue;
    }

    if (token.length > 2 && haystack.includes(token)) {
      score += 8;
    }
  }

  // Prefer listings a buyer can actually evaluate: more photos, real spec data.
  if (score > 0) {
    score += Math.min(listing.images.length, 5);
    if (listing.code) score += 2;
    if (listing.fuel) score += 1;
  }

  return score;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface InventoryQuery {
  query?: string;
  make?: string;
  category?: string;
  fuel?: string;
  limit?: number;
}

interface Extracted {
  tokens: string[];
  category: string | undefined;
  fuel: string | undefined;
}

/** Split a raw query into search tokens plus any category/fuel words acting as filters. */
function extract(query: string, category?: string, fuel?: string): Extracted {
  const tokens: string[] = [];
  let cat = category;
  let fl = fuel;

  for (const token of tokenize(query)) {
    const asCategory = CATEGORY_WORDS[token];
    const asFuel = FUEL_WORDS[token];
    if (asCategory && !cat) {
      cat = asCategory;
      continue;
    }
    if (asFuel && !fl) {
      fl = asFuel;
      continue;
    }
    if (!STOPWORDS.has(token)) tokens.push(token);
  }

  return { tokens, category: cat, fuel: fl };
}

/**
 * True when a query carries meaning the tokenizer cannot read — Arabic, Cyrillic,
 * Chinese and so on. Without this check such a query yields zero tokens, silently
 * falls through to browse mode, and the model reports unrelated stock as if it
 * were the answer. Makes and engine codes are always Latin, so the fix is for the
 * caller to re-search in English.
 */
export function needsTranslation(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false; // an empty query is a legitimate browse
  if (extract(trimmed).tokens.length > 0) return false;
  // Anything from Greek upward: Cyrillic, Arabic, Hebrew, Devanagari, CJK.
  // Latin and Latin-Extended end at U+024F, so this never fires on English.
  return /[\u0370-\uFFFF]/.test(trimmed);
}

export function searchInventory(q: InventoryQuery): ListingMatch[] {
  const { tokens, category, fuel } = extract(q.query ?? "", q.category, q.fuel);

  const makeFilter = q.make?.trim().toLowerCase();
  const pool = listings.filter((l) => {
    if (makeFilter && l.make.toLowerCase() !== makeFilter) return false;
    if (category && l.category !== category) return false;
    // Rows with a blank fuel are unknown, not "not diesel" — never exclude them
    // on a fuel filter, or a third of the yard silently disappears.
    if (fuel && l.fuel && l.fuel !== fuel) return false;
    return true;
  });

  const limit = Math.min(Math.max(q.limit ?? 6, 1), 25);

  // No usable search terms: the buyer is browsing, so show the best-documented stock.
  if (tokens.length === 0) {
    return pool
      .map((l) => ({ ...l, score: l.images.length }))
      .sort((a, b) => b.score - a.score || a.make.localeCompare(b.make))
      .slice(0, limit);
  }

  return pool
    .map((l) => ({ ...l, score: scoreListing(l, tokens) }))
    .filter((l) => l.score > 0)
    .sort((a, b) => b.score - a.score || b.images.length - a.images.length)
    .slice(0, limit);
}

export function findListing(id: string): Listing | undefined {
  const wanted = id.trim().toUpperCase();
  return listings.find((l) => l.id.toUpperCase() === wanted);
}

/** Stock overview for open-ended questions like "what do you have?". */
export function summariseCatalogue(): string {
  const byMake = new Map<string, number>();
  const byCategory = new Map<string, number>();

  for (const l of listings) {
    byMake.set(l.make, (byMake.get(l.make) ?? 0) + 1);
    byCategory.set(l.category, (byCategory.get(l.category) ?? 0) + 1);
  }

  const makes = [...byMake.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([make, n]) => `${make} (${n})`)
    .join(", ");
  const cats = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, n]) => `${cat} (${n})`)
    .join(", ");

  return `${listings.length} listings in the yard right now.\nBy make: ${makes}\nBy type: ${cats}`;
}
