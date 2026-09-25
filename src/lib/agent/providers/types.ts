import type { AgentTool, AgentTurn, ToolCall } from "../types";

export interface LlmRequest {
  system: string;
  turns: AgentTurn[];
  tools: AgentTool[];
}

export interface LlmResponse {
  text: string;
  toolCalls: ToolCall[];
}

/**
 * The only surface the agent loop knows about. Swapping to Claude, Gemini or a
 * self-hosted model means adding one file next to `openai.ts` — the prompt,
 * tools, guard and loop are all provider-agnostic.
 */
export interface LlmProvider {
  readonly id: string;
  readonly model: string;
  complete(req: LlmRequest): Promise<LlmResponse>;
}
