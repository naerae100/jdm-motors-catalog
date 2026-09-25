import type { Listing } from "@/data/listings";

/** A provider-neutral conversation turn. Adapters translate these to wire format. */
export type AgentTurn =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; toolCalls: ToolCall[] }
  | { role: "tool"; callId: string; name: string; result: string };

export interface ToolCall {
  id: string;
  name: string;
  /** Raw JSON string from the model. Always parsed, never string-matched. */
  args: string;
}

/** What one agent turn produced, ready for a transport to deliver. */
export interface AgentReply {
  /** Chat bubbles, in order. The agent deliberately splits into short messages. */
  messages: string[];
  /** Photos to attach, resolved to public paths. */
  photos: PhotoAttachment[];
  /** Set once the conversation has been flagged for a human to quote. */
  handoff: HandoffFlag | null;
  /** Full turn history to persist and feed back on the next call. */
  turns: AgentTurn[];
  /** Populated when the price guard had to intervene. Surfaced in the playground. */
  guardTrips: string[];
}

export interface PhotoAttachment {
  listingId: string;
  caption: string;
  urls: string[];
}

export interface HandoffFlag {
  reason: string;
  summary: string;
  askedAt: string;
}

export interface ToolContext {
  /** Mutated by tools during a turn, then folded into the AgentReply. */
  photos: PhotoAttachment[];
  handoff: HandoffFlag | null;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  run: (args: Record<string, unknown>, ctx: ToolContext) => string;
}

export type ListingMatch = Listing & { score: number };
