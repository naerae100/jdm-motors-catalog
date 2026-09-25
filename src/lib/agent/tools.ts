import { findListing, needsTranslation, searchInventory, summariseCatalogue } from "./inventory";
import { POLICY } from "./policy";
import type { AgentTool, ToolContext } from "./types";
import type { Listing } from "@/data/listings";

/** Compact one-line rendering. Models handle this better than raw JSON blobs. */
function describe(l: Listing): string {
  const bits = [l.make, l.code, l.displacement, l.fuel, l.category].filter(Boolean);
  const models = l.models.length > 0 ? ` fits: ${l.models.join(", ")};` : "";
  return `${l.id} | ${bits.join(" ")} |${models} ${l.images.length} photo(s) | listing text: "${l.caption || "none"}"`;
}

function str(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "search_inventory",
    description:
      "Search the yard for stock. Call this before saying whether something is available — never answer from memory. Accepts messy buyer phrasing like 'u have 4d56?' or 'hilux engine'. ALWAYS search in English using Latin letters, even when the buyer writes in another language — translate first ('محرك نيسان ديزل' becomes 'nissan diesel'). Makes and engine codes are Latin everywhere. Returns matching listings with their reference IDs.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "What the buyer is after, in English/Latin script: engine code, make, or vehicle name (e.g. '4D56', 'triton', 'nissan navara').",
        },
        make: { type: "string", description: "Optional exact make filter, e.g. Toyota." },
        category: {
          type: "string",
          enum: ["Engine", "Half Cut", "Gearbox", "Complete Car"],
          description: "Optional product type filter.",
        },
        fuel: {
          type: "string",
          enum: ["Diesel", "Petrol"],
          description: "Optional fuel filter.",
        },
        limit: {
          type: "number",
          description: "Max results, 1-25. Default 6. Keep it small unless browsing.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    run: (args) => {
      const rawQuery = str(args, "query") ?? "";
      // Refuse rather than silently returning unrelated stock the model would
      // then report as the answer.
      if (needsTranslation(rawQuery)) {
        return `The query "${rawQuery}" is not in Latin script, so nothing could be matched. Translate it to English and call search_inventory again — for example "nissan diesel" or an engine code. Do not tell the buyer anything about stock until you have done that.`;
      }

      const limit = typeof args["limit"] === "number" ? args["limit"] : undefined;
      const results = searchInventory({
        ...(str(args, "query") !== undefined ? { query: str(args, "query") as string } : {}),
        ...(str(args, "make") !== undefined ? { make: str(args, "make") as string } : {}),
        ...(str(args, "category") !== undefined
          ? { category: str(args, "category") as string }
          : {}),
        ...(str(args, "fuel") !== undefined ? { fuel: str(args, "fuel") as string } : {}),
        ...(limit !== undefined ? { limit } : {}),
      });

      if (results.length === 0) {
        return "No matches in current stock. Tell the buyer honestly that you don't have it right now, offer the closest alternative you can find with another search, and mention new stock lands weekly.";
      }
      return `${results.length} match(es):\n${results.map(describe).join("\n")}`;
    },
  },

  {
    name: "send_photos",
    description:
      "Attach photos of specific listings to your reply. Buyers decide on photos, so send them as soon as you've found what they asked for. Use the listing reference IDs returned by search_inventory.",
    parameters: {
      type: "object",
      properties: {
        listing_ids: {
          type: "array",
          items: { type: "string" },
          description: "Listing reference IDs, e.g. ['JDM-045','JDM-222']. Max 4 at a time.",
        },
      },
      required: ["listing_ids"],
      additionalProperties: false,
    },
    run: (args, ctx: ToolContext) => {
      const raw = args["listing_ids"];
      const ids = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
      if (ids.length === 0) return "No listing IDs given, nothing sent.";

      const sent: string[] = [];
      const missing: string[] = [];

      for (const id of ids.slice(0, 4)) {
        const listing = findListing(id);
        if (!listing || listing.images.length === 0) {
          missing.push(id);
          continue;
        }
        ctx.photos.push({
          listingId: listing.id,
          caption:
            [listing.make, listing.code, listing.displacement].filter(Boolean).join(" ") ||
            listing.caption,
          urls: listing.images.slice(0, 5),
        });
        sent.push(`${listing.id} (${listing.images.length} photos)`);
      }

      const parts = [];
      if (sent.length > 0) parts.push(`Photos attached for ${sent.join(", ")}.`);
      if (missing.length > 0) parts.push(`No photos found for ${missing.join(", ")}.`);
      return `${parts.join(" ")} Do not paste image links or describe the photos — just say something short.`;
    },
  },

  {
    name: "get_stock_overview",
    description:
      "Headline numbers for the whole yard: how many listings, broken down by make and product type. Use when a buyer asks broadly what you have, instead of listing everything.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    run: () => summariseCatalogue(),
  },

  {
    name: "flag_for_human",
    description:
      "Hand the commercial side to the sales team. Call this the moment price, a quotation or negotiation comes up, and also when you have a serious buyer with a quantity and destination. After calling it, carry on chatting normally — do not go quiet.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          enum: ["price_request", "quotation", "negotiation", "qualified_lead", "other"],
          description: "Why the team is needed.",
        },
        summary: {
          type: "string",
          description:
            "What the team needs to know to quote fast: engines wanted, quantity, destination port/country, and anything already agreed.",
        },
      },
      required: ["reason", "summary"],
      additionalProperties: false,
    },
    run: (args, ctx: ToolContext) => {
      const reason = str(args, "reason") ?? "other";
      const summary = str(args, "summary") ?? "No summary given.";
      ctx.handoff = { reason, summary, askedAt: new Date().toISOString() };
      return `Flagged for the sales team (${reason}). Tell the buyer the team will send exact numbers shortly, in your own words — then keep the conversation going. You still must not state any price yourself. Minimum order is ${POLICY.minOrderUnits} units and you may mention ${POLICY.shippingDiscountPct}% off shipping at that quantity.`;
    },
  },
];

export const TOOLS_BY_NAME = new Map(AGENT_TOOLS.map((t) => [t.name, t]));
