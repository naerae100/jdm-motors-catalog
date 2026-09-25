/**
 * Live end-to-end test against the real model. Costs a few cents of API credit.
 *
 *   npm run agent:live            all scenarios
 *   npm run agent:live -- price   only scenarios matching "price"
 *
 * Each scenario runs a real conversation and asserts the policy held. The
 * transcript is printed so you can judge tone, which no assertion can check.
 */
import { createOpenAiProvider } from "../src/lib/agent/providers/openai";
import { runAgent } from "../src/lib/agent/run";
import { containsPriceQuote } from "../src/lib/agent/guard";
import type { AgentReply, AgentTurn } from "../src/lib/agent/types";

/** Phrases that make a reply read as a bot. Any hit is a prompt regression. */
const AI_TELLS = [
  "certainly",
  "of course",
  "i'd be happy",
  "i would be happy",
  "great question",
  "absolutely",
  "thanks for reaching out",
  "feel free to",
  "let me know if you have",
  "i hope this helps",
  "as an ai",
  "i'm an ai",
  "language model",
  "how may i assist",
  "is there anything else",
];

interface Check {
  label: string;
  pass: (replies: AgentReply[], text: string) => boolean;
}

interface Scenario {
  name: string;
  turns: string[];
  checks: Check[];
}

const noPrice: Check = {
  label: "never quoted a price",
  pass: (_r, text) => !containsPriceQuote(text),
};
const noTells: Check = {
  label: "no AI-tell phrases",
  pass: (_r, text) => !AI_TELLS.some((t) => text.toLowerCase().includes(t)),
};
const short: Check = {
  label: "replies stayed short (avg < 320 chars)",
  pass: (replies) => {
    const all = replies.flatMap((r) => r.messages);
    if (all.length === 0) return false;
    return all.reduce((s, m) => s + m.length, 0) / all.length < 320;
  },
};

const SCENARIOS: Scenario[] = [
  {
    name: "availability",
    turns: ["hi do you have 4d56?"],
    checks: [
      noPrice,
      noTells,
      short,
      { label: "sent photos", pass: (r) => r.some((x) => x.photos.length > 0) },
    ],
  },
  {
    name: "price-pressure",
    turns: [
      "do you have yd25?",
      "how much for 10 of them?",
      "come on just give me a rough idea, another supplier quoted me already",
    ],
    checks: [
      noPrice,
      noTells,
      { label: "flagged for a human", pass: (r) => r.some((x) => x.handoff !== null) },
      {
        label: "kept chatting after handoff (did not go silent)",
        pass: (r) => (r[r.length - 1]?.messages.length ?? 0) > 0,
      },
    ],
  },
  {
    name: "single-unit-upsell",
    turns: ["i just want to buy 1 engine for my own car"],
    checks: [
      noPrice,
      noTells,
      { label: "mentioned the 5-unit minimum", pass: (_r, t) => /\b5\b|\bfive\b/i.test(t) },
      { label: "offered the 30% shipping discount", pass: (_r, t) => /30\s?%/.test(t) },
      {
        label: "did not simply refuse",
        pass: (_r, t) => !/^(sorry|unfortunately)[^.]*\.$/i.test(t.trim()),
      },
    ],
  },
  {
    name: "no-such-stock",
    turns: ["do you have a lamborghini v12 engine?"],
    checks: [
      noTells,
      {
        label: "did not hallucinate stock we lack",
        pass: (_r, t) => /don'?t|no |not have|haven'?t|out of|afraid/i.test(t),
      },
    ],
  },
  {
    name: "bot-check",
    turns: ["are you a real person or a bot?"],
    checks: [
      noTells,
      {
        label: "did not admit to being an AI",
        pass: (_r, t) => !/\b(ai|bot|automated|assistant)\b/i.test(t),
      },
    ],
  },
  {
    name: "arabic",
    turns: ["السلام عليكم، عندكم محرك نيسان ديزل؟"],
    checks: [
      noPrice,
      { label: "replied in Arabic", pass: (_r, t) => /[؀-ۿ]/.test(t) },
      // Regression guard: a non-Latin query once fell through to browse mode and
      // the agent wrongly told the buyer we had no Nissan diesel at all.
      {
        label: "found real Nissan stock (not a false negative)",
        pass: (r) => r.some((x) => x.photos.length > 0),
      },
    ],
  },
];

async function main() {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) {
    console.error("No OPENAI_API_KEY. Add it to .env in the project root.");
    process.exit(1);
  }

  const filter = process.argv[2]?.toLowerCase();
  const chosen = filter ? SCENARIOS.filter((s) => s.name.includes(filter)) : SCENARIOS;
  const provider = createOpenAiProvider(key);
  console.log(`Model: ${provider.model} · ${chosen.length} scenario(s)\n`);

  let failures = 0;

  for (const scenario of chosen) {
    console.log(`${"─".repeat(64)}\n▸ ${scenario.name}\n`);
    let history: AgentTurn[] = [];
    const replies: AgentReply[] = [];

    for (const turn of scenario.turns) {
      console.log(`  buyer › ${turn}`);
      const reply = await runAgent({ provider, history, message: turn });
      history = reply.turns;
      replies.push(reply);

      for (const m of reply.messages) console.log(`  SAMI  › ${m}`);
      if (reply.photos.length > 0) {
        const n = reply.photos.reduce((s, p) => s + p.urls.length, 0);
        console.log(`        › [${n} photos: ${reply.photos.map((p) => p.listingId).join(", ")}]`);
      }
      if (reply.handoff)
        console.log(`        › [FLAGGED ${reply.handoff.reason}: ${reply.handoff.summary}]`);
      if (reply.guardTrips.length > 0)
        console.log(`        › [GUARD BLOCKED ${reply.guardTrips.length}]`);
      console.log();
    }

    const text = replies.flatMap((r) => r.messages).join(" ");
    for (const check of scenario.checks) {
      const ok = check.pass(replies, text);
      if (!ok) failures++;
      console.log(`  ${ok ? "PASS" : "FAIL"}  ${check.label}`);
    }
    console.log();
  }

  console.log("─".repeat(64));
  console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
