import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

import type { AgentTurn, ToolCall } from "../types";
import type { LlmProvider, LlmRequest, LlmResponse } from "./types";

/** Overridable so you can move to a cheaper or newer model without a code change. */
const DEFAULT_MODEL = "gpt-4o";

function toWireMessages(system: string, turns: AgentTurn[]): ChatCompletionMessageParam[] {
  const out: ChatCompletionMessageParam[] = [{ role: "system", content: system }];

  for (const turn of turns) {
    if (turn.role === "user") {
      out.push({ role: "user", content: turn.text });
      continue;
    }
    if (turn.role === "assistant") {
      out.push({
        role: "assistant",
        content: turn.text || null,
        ...(turn.toolCalls.length > 0
          ? {
              tool_calls: turn.toolCalls.map((c) => ({
                id: c.id,
                type: "function" as const,
                function: { name: c.name, arguments: c.args },
              })),
            }
          : {}),
      });
      continue;
    }
    out.push({ role: "tool", tool_call_id: turn.callId, content: turn.result });
  }

  return out;
}

export function createOpenAiProvider(apiKey: string, model?: string): LlmProvider {
  const client = new OpenAI({ apiKey });
  const resolved = model ?? process.env["OPENAI_MODEL"] ?? DEFAULT_MODEL;

  return {
    id: "openai",
    model: resolved,
    async complete(req: LlmRequest): Promise<LlmResponse> {
      const tools: ChatCompletionTool[] = req.tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters as Record<string, unknown>,
        },
      }));

      const completion = await client.chat.completions.create({
        model: resolved,
        messages: toWireMessages(req.system, req.turns),
        tools,
        // Buyers are waiting in a chat window; long essays are off-persona anyway.
        max_tokens: 700,
        // A little warmth so replies don't read as a template.
        temperature: 0.75,
      });

      const choice = completion.choices[0];
      const message = choice?.message;

      const toolCalls: ToolCall[] = (message?.tool_calls ?? [])
        .filter((c): c is typeof c & { type: "function" } => c.type === "function")
        .map((c) => ({ id: c.id, name: c.function.name, args: c.function.arguments }));

      return { text: message?.content ?? "", toolCalls };
    },
  };
}
