import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { chatWithBusinessAI } from "@/lib/publicShopsApi";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const AI_LOCK_DATE_KEY = "publicdukan_ai_chat_locked_date";
const AI_WIDGET_SIDE_KEY = "publicdukan_ai_chat_widget_side";

type WidgetSide = "right" | "left";

const getIstDateKey = (date = new Date()) => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    // Fallback to local date if Intl/timeZone not available.
    return new Date().toISOString().slice(0, 10);
  }
};

export default function AiChatWidget(props: { businessId: string | null; businessName?: string }) {
  const businessId = props.businessId;
  const title = useMemo(() => {
    const name = String(props.businessName || "").trim();
    return name ? `${name} Assistant` : "Shop Assistant";
  }, [props.businessName]);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [planBlocked, setPlanBlocked] = useState(false);
  const [side, setSide] = useState<WidgetSide>(() => {
    try {
      const saved = String(localStorage.getItem(AI_WIDGET_SIDE_KEY) || "").trim();
      return saved === "left" ? "left" : "right";
    } catch {
      return "right";
    }
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: "assistant",
      content: "Namaste! Aap shop ke products/services ke baare me puch sakte ho.",
    },
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Scroll to bottom whenever opened.
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open]);

  useEffect(() => {
    // Restore lock state per IST day.
    try {
      const today = getIstDateKey(new Date());
      const lockedDate = localStorage.getItem(AI_LOCK_DATE_KEY);
      if (lockedDate && lockedDate === today) {
        setLocked(true);
      } else {
        localStorage.removeItem(AI_LOCK_DATE_KEY);
        setLocked(false);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(AI_WIDGET_SIDE_KEY, side);
    } catch {
      // ignore
    }
  }, [side]);

  useEffect(() => {
    // Auto-scroll on new messages.
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  if (!businessId) return null;

  const send = async () => {
    const text = String(input || "").trim();
    if (!text || loading || locked || planBlocked) return;

    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const resp = await chatWithBusinessAI({ businessId, userMessage: text });
      setMessages((prev) => [...prev, { role: "assistant", content: resp.reply }]);
    } catch (e: unknown) {
      const status = (e as any)?.status;
      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as any).message || "")
          : "";

      if (status === 403) {
        setPlanBlocked(true);
      }

      if (status === 429) {
        try {
          localStorage.setItem(AI_LOCK_DATE_KEY, getIstDateKey(new Date()));
        } catch {
          // ignore
        }
        setLocked(true);
      }

      const fallback =
        status === 429
          ? msg || "Aaj ke 5 AI questions complete ho gaye. Ab aap kal phir try kar sakte ho."
          : status === 403
            ? msg || "Is shop ke current plan me AI chat available nahi hai."
          : "Sorry, abhi network issue hai. Aap WhatsApp/call pe contact kar lo.";

      setMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSide = () => {
    setSide((prev) => (prev === "right" ? "left" : "right"));
  };

  return (
    // On mobile keep the chat button above the bottom nav (use larger bottom offset),
    // while on sm+ screens keep the original small offset.
    <div
      className={cn(
        "fixed z-50 bottom-20 sm:bottom-4",
        side === "right" ? "right-4" : "left-4"
      )}
    >
      {!open ? (
        <Button
          type="button"
          className="gap-2 rounded-full shadow"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
        >
          <MessageCircle className="h-4 w-4" /> Chat
        </Button>
      ) : (
        <Card className="w-[min(92vw,380px)] shadow-lg">
          <CardHeader className="py-3 px-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold truncate">{title}</div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleSide}
                  aria-label={side === "right" ? "Move chat to left" : "Move chat to right"}
                  title={side === "right" ? "Move to left" : "Move to right"}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-3">
            <div
              ref={listRef}
              className="h-64 overflow-auto pr-1 space-y-2"
              aria-label="Chat messages"
            >
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-line",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-muted text-foreground"
                  )}
                >
                  {m.content}
                </div>
              ))}
              {loading ? (
                <div className="mr-auto max-w-[85%] rounded-lg px-3 py-2 text-sm bg-muted text-foreground">
                  Typing...
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={loading || locked || planBlocked}
              />
              <Button
                type="button"
                className="shrink-0"
                onClick={send}
                disabled={locked || planBlocked || loading || !String(input).trim()}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {planBlocked ? (
              <div className="mt-2 text-xs text-muted-foreground">
                AI chat is not available for this shop plan.
              </div>
            ) : null}

            {locked ? (
              <div className="mt-2 text-xs text-muted-foreground">
                Daily limit reached (5 requests). Try again tomorrow.
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
