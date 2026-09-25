/**
 * Offline self-test for the sales agent. No API key needed — a scripted provider
 * replays canned model responses so the loop, tools, guard and message-splitting
 * are all exercised deterministically.
 *
 * Run after ANY change to prompt.ts, guard.ts or tools.ts:  npm run agent:test
 */

import { containsPriceQuote } from "../src/lib/agent/guard";
const shouldTrip = [
  "It's $450 per unit",
  "450 USD each",
  "around 1200 AED",
  "price is 400",
  "we sell at 380 per piece",
  "roughly five hundred dollars",
  "€300",
  "cost 250 dirhams",
  "per unit 400",
];
const shouldPass = [
  "We do 30% off shipping if you take 5 units",
  "The 4D56 is a 2.5L V4 diesel",
  "Ref JDM-045, we have 12 in stock",
  "Call me on +971 50 899 7740",
  "It's a 2015 model, 16 valve",
  "I'll get you exact numbers from our sales guy",
  "We have 5 engines ready, 40ft container",
];
let fail = 0;
for (const s of shouldTrip) {
  const r = containsPriceQuote(s);
  if (!r) {
    console.log("MISSED (should trip):", s);
    fail++;
  }
}
for (const s of shouldPass) {
  const r = containsPriceQuote(s);
  if (r) {
    console.log("FALSE POSITIVE (should pass):", s);
    fail++;
  }
}
console.log(
  fail === 0
    ? `\nguard OK — ${shouldTrip.length} traps caught, ${shouldPass.length} safe lines passed`
    : `\n${fail} failures`,
);

import { runAgent } from "../src/lib/agent/run";
import type { LlmProvider, LlmRequest, LlmResponse } from "../src/lib/agent/providers/types";

/** Scripted provider: replays canned model responses so the loop can be tested offline. */
function mock(script: LlmResponse[]): LlmProvider {
  let i = 0;
  return {
    id: "mock",
    model: "mock-1",
    async complete(_req: LlmRequest) {
      return script[i++] ?? { text: "(script exhausted)", toolCalls: [] };
    },
  };
}

async function main() {
  // 1. Tool call -> photos -> final prose, with markdown + double-newline splitting
  const r1 = await runAgent({
    provider: mock([
      { text: "", toolCalls: [{ id: "t1", name: "search_inventory", args: '{"query":"4d56"}' }] },
      {
        text: "",
        toolCalls: [{ id: "t2", name: "send_photos", args: '{"listing_ids":["JDM-222"]}' }],
      },
      {
        text: "**Yes** we've got 4D56 in stock.\n\n- Which port are you shipping to?",
        toolCalls: [],
      },
    ]),
    history: [],
    message: "do you have 4d56?",
  });
  console.log("TEST 1 — tools + photos + formatting");
  console.log("  bubbles:", JSON.stringify(r1.messages));
  console.log(
    "  photos:",
    r1.photos.map((p) => `${p.listingId}:${p.urls.length}`).join(",") || "none",
  );
  console.log(
    "  markdown stripped:",
    !r1.messages.join("").includes("**") && !r1.messages.join("").includes("- Which"),
  );

  // 2. Price guard: model leaks a price, retry also leaks -> safe fallback
  const r2 = await runAgent({
    provider: mock([
      { text: "It's $450 per unit for the 4D56.", toolCalls: [] },
      { text: "Around 450 USD each honestly.", toolCalls: [] },
    ]),
    history: [],
    message: "how much?",
  });
  console.log("\nTEST 2 — price guard, both attempts leak");
  console.log("  final:", JSON.stringify(r2.messages));
  console.log("  guard trips:", r2.guardTrips.length);
  console.log("  no price in output:", !/\$|usd/i.test(r2.messages.join(" ")));

  // 3. Price guard: retry is clean -> retry text used
  const r3 = await runAgent({
    provider: mock([
      { text: "It's $450 per unit.", toolCalls: [] },
      { text: "Our sales guy will send you exact numbers shortly. Which port?", toolCalls: [] },
    ]),
    history: [],
    message: "price?",
  });
  console.log("\nTEST 3 — price guard, retry is clean");
  console.log("  final:", JSON.stringify(r3.messages));
  console.log(
    "  used retry:",
    r3.messages.join(" ").includes("sales guy"),
    "| trips:",
    r3.guardTrips.length,
  );

  // 4. Handoff flag
  const r4 = await runAgent({
    provider: mock([
      {
        text: "",
        toolCalls: [
          {
            id: "t1",
            name: "flag_for_human",
            args: '{"reason":"price_request","summary":"Wants 5x 4D56 to Mombasa"}',
          },
        ],
      },
      { text: "Sales team will message you with numbers shortly.", toolCalls: [] },
    ]),
    history: [],
    message: "send me a quotation for 5 units to mombasa",
  });
  console.log("\nTEST 4 — human handoff");
  console.log("  flagged:", r4.handoff?.reason, "|", r4.handoff?.summary);

  // 5. Empty search is reported honestly, not hallucinated
  const r5 = await runAgent({
    provider: mock([
      {
        text: "",
        toolCalls: [{ id: "t1", name: "search_inventory", args: '{"query":"lamborghini v12"}' }],
      },
      { text: "Don't have that one.", toolCalls: [] },
    ]),
    history: [],
    message: "got a lamborghini v12?",
  });
  const toolTurn = r5.turns.find((t) => t.role === "tool");
  console.log("\nTEST 5 — no match handling");
  console.log(
    "  tool told model:",
    toolTurn && toolTurn.role === "tool" ? toolTurn.result.slice(0, 60) : "?",
  );

  // 6. Malformed tool args must not crash the loop
  const r6 = await runAgent({
    provider: mock([
      { text: "", toolCalls: [{ id: "t1", name: "search_inventory", args: "{not json" }] },
      { text: "What are you after?", toolCalls: [] },
    ]),
    history: [],
    message: "hi",
  });
  console.log("\nTEST 6 — malformed tool JSON survived:", JSON.stringify(r6.messages));
}
main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
