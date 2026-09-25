import { createServerFn } from "@tanstack/react-start";

import { createOpenAiProvider } from "./providers/openai";
import { runAgent } from "./run";
import type { AgentReply, AgentTurn } from "./types";

export type AgentResult =
  ({ ok: true; model: string } & AgentReply) | { ok: false; error: string; hint?: string };

interface AgentInput {
  message: string;
  history: AgentTurn[];
}

/**
 * Cost ceilings. This endpoint is publicly reachable from the catalogue, so the
 * client-side limits in ChatWidget are a convenience, not a control — anyone can
 * POST directly. These are the ones that actually bound the bill.
 */
const MAX_MESSAGE_LENGTH = 800;
const MAX_TURNS = 40;

/**
 * Server-side only. The API key never reaches the browser — Vite injects
 * `VITE_*` vars into the client bundle, so this one is deliberately unprefixed.
 */
export const sendToAgent = createServerFn({ method: "POST" })
  .validator((data: AgentInput) => data)
  .handler(async ({ data }): Promise<AgentResult> => {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      return {
        ok: false,
        error: "No OPENAI_API_KEY set on the server.",
        hint: "Add OPENAI_API_KEY=sk-... to a .env file in the project root, then restart the dev server.",
      };
    }

    const message = String(data.message ?? "")
      .trim()
      .slice(0, MAX_MESSAGE_LENGTH);
    if (!message) return { ok: false, error: "Empty message." };

    const history = Array.isArray(data.history) ? data.history.slice(-MAX_TURNS) : [];

    const provider = createOpenAiProvider(apiKey);

    try {
      const reply = await runAgent({ provider, history, message });
      return { ok: true, model: provider.model, ...reply };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("[agent] turn failed:", error);
      return {
        ok: false,
        error: detail,
        // Wrong-model and out-of-credit are the two failures worth naming.
        hint: detail.includes("model")
          ? "Your key may not have access to this model. Set OPENAI_MODEL to one your account can use."
          : "Check the API key is valid and the account has credit.",
      };
    }
  });
