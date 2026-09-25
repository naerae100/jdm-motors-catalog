import { MessageCircle, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUSINESS } from "@/lib/agent/policy";
import type { AgentResult } from "@/lib/agent/http";
import type { AgentTurn, PhotoAttachment } from "@/lib/agent/types";
import { cn } from "@/lib/utils";

interface Bubble {
  id: string;
  from: "buyer" | "agent";
  text: string;
  photos?: PhotoAttachment[];
}

/** Shown instantly on first open. Costs nothing and makes the widget feel alive. */
const GREETING =
  "Hi, Sami here from Miami Motors. Tell me which engine you're after and I'll check the yard for you.";

const STORAGE_KEY = "mm_sales_chat_v1";
/** Keeps a long session from growing the prompt (and the bill) without bound. */
const MAX_TURNS_KEPT = 40;
const MAX_MESSAGE_LENGTH = 800;

let seq = 0;
const nextId = () => `b${Date.now()}_${++seq}`;

function PhotoGrid({ photos }: { photos: PhotoAttachment[] }) {
  return (
    <div className="mt-2 space-y-2">
      {photos.map((p) => (
        <div key={p.listingId}>
          <div className="grid grid-cols-3 gap-1">
            {p.urls.slice(0, 3).map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={p.caption}
                  loading="lazy"
                  className="aspect-square w-full rounded-md object-cover transition-opacity hover:opacity-80"
                />
              </a>
            ))}
          </div>
          <p className="mt-1 text-[11px] opacity-70">{p.caption}</p>
        </div>
      ))}
    </div>
  );
}

export function ChatWidget({ liftAboveBar = false }: { liftAboveBar?: boolean }) {
  const [open, setOpen] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [history, setHistory] = useState<AgentTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore after mount only — reading storage during render would desync SSR markup.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { bubbles?: Bubble[]; history?: AgentTurn[] };
      if (saved.bubbles?.length) setBubbles(saved.bubbles);
      if (saved.history?.length) setHistory(saved.history);
    } catch {
      // Private mode, blocked storage, or stale shape — start fresh.
    }
  }, []);

  useEffect(() => {
    if (bubbles.length === 0) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ bubbles, history }));
    } catch {
      // Storage full or unavailable; the chat still works for this session.
    }
  }, [bubbles, history]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles, busy, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!trimmed || busy) return;

      setDraft("");
      setFailed(false);
      setBubbles((b) => [...b, { id: nextId(), from: "buyer", text: trimmed }]);
      setBusy(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: trimmed, history: history.slice(-MAX_TURNS_KEPT) }),
        });
        const result = (await response.json()) as AgentResult;

        if (!result.ok) {
          setFailed(true);
          return;
        }

        setHistory(result.turns);
        setBubbles((b) => [
          ...b,
          ...result.messages.map((msg, i) => ({
            id: nextId(),
            from: "agent" as const,
            text: msg,
            ...(i === result.messages.length - 1 && result.photos.length > 0
              ? { photos: result.photos }
              : {}),
          })),
        ]);
      } catch {
        setFailed(true);
      } finally {
        setBusy(false);
      }
    },
    [busy, history],
  );

  const shown: Bubble[] =
    bubbles.length === 0 ? [{ id: "greeting", from: "agent", text: GREETING }] : bubbles;

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with our sales team"
          className={cn(
            "fixed right-4 z-50 flex items-center gap-2.5 rounded-full bg-whatsapp px-4 py-3.5 text-whatsapp-foreground shadow-lg shadow-whatsapp/30 transition-all hover:scale-105 hover:shadow-xl sm:right-6",
            liftAboveBar ? "bottom-28 sm:bottom-32" : "bottom-5 sm:bottom-6",
          )}
        >
          <MessageCircle className="size-6" />
          <span className="hidden text-sm font-semibold sm:inline">Chat with sales</span>
          <span className="absolute right-1 top-1 size-2.5 rounded-full bg-primary ring-2 ring-background" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Sales chat"
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden border bg-card shadow-2xl",
            "inset-x-3 bottom-3 top-16 rounded-2xl",
            "sm:inset-x-auto sm:top-auto sm:right-6 sm:h-[600px] sm:max-h-[calc(100vh-6rem)] sm:w-[390px]",
            liftAboveBar ? "sm:bottom-32" : "sm:bottom-6",
          )}
        >
          <header className="flex items-center justify-between gap-3 bg-steel px-4 py-3 text-steel-foreground">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative shrink-0">
                <img
                  src="/logo.png"
                  alt=""
                  className="size-9 rounded-full bg-white object-contain p-0.5"
                />
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-whatsapp ring-2 ring-steel" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold uppercase tracking-wide">
                  {BUSINESS.name} · Sales
                </p>
                <p className="truncate text-[11px] opacity-70">
                  Typically replies in a few seconds
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1.5 transition-colors hover:bg-black/10"
            >
              <X className="size-5" />
            </button>
          </header>

          <div className="flex-1 space-y-2.5 overflow-y-auto bg-muted/40 p-3.5">
            {shown.map((b) => (
              <div
                key={b.id}
                className={cn("flex", b.from === "buyer" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                    b.from === "buyer"
                      ? "rounded-br-sm bg-whatsapp text-whatsapp-foreground"
                      : "rounded-bl-sm bg-card",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{b.text}</p>
                  {b.photos && b.photos.length > 0 && <PhotoGrid photos={b.photos} />}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-card px-4 py-3 shadow-sm">
                  <span className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}

            {failed && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs">
                <p className="text-destructive">Couldn't send that just now.</p>
                <a
                  href={`https://wa.me/${BUSINESS.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block font-medium underline"
                >
                  Message us on WhatsApp instead
                </a>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
            className="flex items-center gap-2 border-t bg-background p-2.5"
          >
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Type your message…"
              aria-label="Your message"
              className="rounded-full border-muted"
            />
            <Button
              type="submit"
              size="icon"
              variant="whatsapp"
              className="size-10 shrink-0 rounded-full"
              disabled={busy || !draft.trim()}
              aria-label="Send"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
