import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, AlertCircle, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { businessApi, supportApi, type SupportTicket } from "@/lib/api/index";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntitlements } from "@/contexts/EntitlementsContext";

const statusColor: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-zinc-200 text-zinc-700",
};

const issueLabel: Record<string, string> = {
  billing: "Billing",
  technical: "Technical",
  other: "Other",
};

const Support = () => {
  const [showNew, setShowNew] = useState(false);
  const [issueType, setIssueType] = useState("billing");
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSuspended, setIsSuspended] = useState(false);

  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { suspended } = useEntitlements();

  const fetchTickets = async () => {
    try {
      setError("");
      setLoading(true);
      const res = await supportApi.listMyTickets();
      if (!res.success || !res.data) throw new Error(res.message || "Failed to load tickets");
      setTickets(res.data);
    } catch (e: any) {
      setError(e.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const bizRes = await businessApi.getMyBusinesses({ force: true });
        const currentBusiness = bizRes.success && bizRes.data && bizRes.data.length > 0 ? bizRes.data[0] : null;
        const suspendedByBusiness = currentBusiness ? currentBusiness.isActive === false : false;
        const suspendedByUser = user ? user.isActive === false : false;
        if (!cancelled) {
          setIsSuspended(suspendedByBusiness || suspendedByUser);
        }
      } catch {
        if (!cancelled) {
          setIsSuspended(!!(user && !user.isActive));
        }
      }

      await fetchTickets();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate, user]);

  const handleCreate = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    try {
      setSubmitting(true);
      setError("");
      const res = await supportApi.createTicket({ issueType, message: trimmed });
      if (!res.success) throw new Error(res.message || "Failed to create ticket");
      setMessage("");
      setShowNew(false);
      await fetchTickets();
    } catch (e: any) {
      setError(e.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (ticketId: string) => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    const ticket = tickets.find((t) => t._id === ticketId);
    if (ticket?.status === "closed") {
      setError("Closed ticket cannot receive new messages");
      setReplyingId(null);
      setReplyText("");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const res = await supportApi.addMessage(ticketId, trimmed);
      if (!res.success) throw new Error(res.message || "Failed to send message");
      setReplyText("");
      setReplyingId(null);
      await fetchTickets();
    } catch (e: any) {
      setError(e.message || "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const viewModel = useMemo(() => {
    return tickets.map((t) => {
      const created = t.createdAt ? new Date(t.createdAt) : null;
      const date = created ? created.toLocaleDateString("en-IN") : "";
      const firstUserMessage = t.messages?.find((m) => m.senderRole === "user")?.message || "";
      const lastAdminMessage = [...(t.messages || [])].reverse().find((m) => m.senderRole === "admin")?.message || "";
      return {
        _id: t._id,
        ticketId: t.ticketId,
        issueType: issueLabel[t.issueType] || t.issueType,
        status: t.status,
        date,
        message: firstUserMessage,
        response: lastAdminMessage,
      };
    });
  }, [tickets]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Support</h1>
        <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold">
          <Plus className="w-4 h-4" /> {isSuspended || suspended ? "Contact Support" : "New Ticket"}
        </button>
      </div>

      {error ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : null}

      {isSuspended ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-700 mt-0.5" />
          <p className="text-sm text-yellow-800">
            Aapka account suspended hai. Aap yahin se support team ko message kar sakte hain.
          </p>
        </div>
      ) : null}

      {showNew && (
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-card border rounded-xl p-4 space-y-3">
          <select value={issueType} onChange={(e) => setIssueType(e.target.value)} className="w-full px-3 py-2.5 bg-muted border rounded-lg text-sm">
            <option value="billing">Billing</option>
            <option value="technical">Technical</option>
            <option value="other">Other</option>
          </select>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue..." rows={3} className="w-full px-3 py-2.5 bg-muted border rounded-lg text-sm resize-none" />
          <button
            disabled={submitting || !message.trim()}
            onClick={handleCreate}
            className="bg-primary disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </motion.div>
      )}

      <div className="space-y-2">
        {viewModel.map(t => (
          <div key={t.ticketId} className="bg-card border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{t.ticketId} · {t.issueType}</p>
                <p className="text-xs text-muted-foreground">{t.date}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor[t.status] || "bg-muted text-muted-foreground"}`}>{t.status}</span>
            </div>
            <p className="text-sm text-muted-foreground">{t.message}</p>
            {t.response && <div className="bg-muted rounded-lg p-2.5 text-xs"><strong>Response:</strong> {t.response}</div>}

            <div className="pt-2">
              {replyingId === t._id && t.status !== "closed" ? (
                <div className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a message..."
                    rows={2}
                    className="w-full px-3 py-2.5 bg-muted border rounded-lg text-sm resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      disabled={submitting || !replyText.trim()}
                      onClick={() => handleReply(t._id)}
                      className="flex items-center gap-1.5 bg-primary disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold"
                    >
                      <Send className="w-4 h-4" /> Send
                    </button>
                    <button
                      disabled={submitting}
                      onClick={() => {
                        setReplyingId(null);
                        setReplyText("");
                      }}
                      className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-border hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : t.status === "closed" ? (
                <p className="text-xs font-medium text-muted-foreground">Ticket closed. New messages are disabled.</p>
              ) : (
                <button
                  disabled={submitting}
                  onClick={() => {
                    setReplyingId(t._id);
                    setReplyText("");
                  }}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Add Message
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Support;
