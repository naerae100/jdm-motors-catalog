import { SAFE_PRICE_FALLBACK, containsPriceQuote } from "./guard";
import { PRICE_RETRY_NUDGE, buildSystemPrompt } from "./prompt";
import { AGENT_TOOLS, TOOLS_BY_NAME } from "./tools";
import type { AgentReply, AgentTurn, ToolContext } from "./types";
import type { LlmProvider } from "./providers/types";

/** Ceiling on tool round-trips per buyer message. Real turns use 1-3. */
const MAX_TOOL_ITERATIONS = 5;

/** WhatsApp has no markdown. Strip anything the model formats out of habit. */
function stripFormatting(text: string): string {
  return (
    text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/(^|\s)\*(\S.*?\S)\*(?=\s|$)/g, "$1$2")
      // Line-anchored strips use [ \t] not \s — \s would swallow the blank line
      // that separates one chat bubble from the next.
      .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
      .replace(/^[ \t]*[-•*][ \t]+/gm, "")
      .replace(/^[ \t]*\d+\.[ \t]+/gm, "")
      .trim()
  );
}

/** A blank line is the agent's cue to send a second, separate message. */
function splitIntoMessages(text: string): string[] {
  const cleaned = stripFormatting(text);
  if (!cleaned) return [];
  return cleaned
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, 3);
}

function safeParse(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    return parsed !== null && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export interface RunOptions {
  provider: LlmProvider;
  /** Prior turns from this conversation. Pass back what the last reply returned. */
  history: AgentTurn[];
  message: string;
}

/**
 * Runs one buyer message to completion: tool calls, price guard, then the
 * bubbles a transport should send. Transport-agnostic on purpose — the
 * playground and, later, the WhatsApp webhook both call exactly this.
 */
export async function runAgent(opts: RunOptions): Promise<AgentReply> {
  const system = buildSystemPrompt();
  const turns: AgentTurn[] = [...opts.history, { role: "user", text: opts.message }];
  const ctx: ToolContext = { photos: [], handoff: null };
  const guardTrips: string[] = [];

  let text = "";

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await opts.provider.complete({ system, turns, tools: AGENT_TOOLS });

    if (response.toolCalls.length === 0) {
      text = response.text;
      turns.push({ role: "assistant", text, toolCalls: [] });
      break;
    }

    turns.push({ role: "assistant", text: response.text, toolCalls: response.toolCalls });

    for (const call of response.toolCalls) {
      const tool = TOOLS_BY_NAME.get(call.name);
      const result = tool
        ? tool.run(safeParse(call.args), ctx)
        : `Unknown tool "${call.name}". Answer without it.`;
      turns.push({ role: "tool", callId: call.id, name: call.name, result });
    }

    // Ran out of iterations mid-tool-use: take whatever prose we have.
    if (i === MAX_TOOL_ITERATIONS - 1) text = response.text;
  }

  // Defence in depth: the prompt forbids prices, this catches it when ignored.
  if (text && containsPriceQuote(text)) {
    guardTrips.push(text);
    const retry = await opts.provider.complete({
      system: `${system}\n\n# Correction\n\n${PRICE_RETRY_NUDGE}`,
      turns: turns.slice(0, -1),
      tools: AGENT_TOOLS,
    });
    text = containsPriceQuote(retry.text) ? SAFE_PRICE_FALLBACK : retry.text;
    if (text === SAFE_PRICE_FALLBACK) guardTrips.push(retry.text);

    const last = turns[turns.length - 1];
    if (last && last.role === "assistant") last.text = text;
  }

  return {
    messages: splitIntoMessages(text),
    photos: ctx.photos,
    handoff: ctx.handoff,
    turns,
    guardTrips,
  };
}
