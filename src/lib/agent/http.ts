import { createOpenAiProvider } from "./providers/openai";
import { runAgent } from "./run";
import type { AgentReply, AgentTurn } from "./types";

export type AgentResult =
  ({ ok: true; model: string } & AgentReply) | { ok: false; error: string; hint?: string };

/**
 * Cost ceilings. This endpoint is publicly reachable from the catalogue, so the
 * limits in ChatWidget are a convenience, not a control — anyone can POST here
 * directly. These are the ones that actually bound the bill.
 */
const MAX_MESSAGE_LENGTH = 800;
const MAX_TURNS = 40;

function json(body: AgentResult, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * Plain HTTP handler for the sales agent, deliberately NOT a `createServerFn`.
 *
 * Registering a server function pulls the agent into the SSR entry chunk, which
 * grows it past the bundler's split threshold; the resulting split produces a
 * circular import that crashes every page render. A route handler behind a
 * dynamic import keeps the entry graph untouched. See src/server.ts.
 */
export async function handleChatRequest(request: Request, env?: unknown): Promise<Response> {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Use POST." }, 405);
  }

  // Cloudflare-style runtimes pass secrets on `env` rather than process.env.
  const fromEnvBinding =
    env && typeof env === "object" && "OPENAI_API_KEY" in env
      ? String((env as Record<string, unknown>)["OPENAI_API_KEY"] ?? "")
      : "";
  const apiKey = process.env["OPENAI_API_KEY"] ?? fromEnvBinding;

  if (!apiKey) {
    return json({
      ok: false,
      error: "The chat isn't configured yet.",
      hint: "Set OPENAI_API_KEY as a server-side environment variable.",
    });
  }

  let body: { message?: unknown; history?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "Malformed request." }, 400);
  }

  const message = String(body.message ?? "")
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
  if (!message) return json({ ok: false, error: "Empty message." }, 400);

  const history: AgentTurn[] = Array.isArray(body.history)
    ? (body.history as AgentTurn[]).slice(-MAX_TURNS)
    : [];

  const provider = createOpenAiProvider(apiKey);

  try {
    const reply = await runAgent({ provider, history, message });
    return json({ ok: true, model: provider.model, ...reply });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[agent] turn failed:", error);
    return json({
      ok: false,
      error: detail,
      hint: detail.includes("model")
        ? "The key may not have access to this model. Set OPENAI_MODEL to one the account can use."
        : "Check the API key is valid and the account has credit.",
    });
  }
}
