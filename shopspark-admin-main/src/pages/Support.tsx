import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useMemo, useState } from "react";
import { supportAdminApi, type SupportTicket, type SupportTicketStatus } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const issueLabel: Record<string, string> = {
  billing: "Billing",
  technical: "Technical",
  other: "Other",
};

export default function Support() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SupportTicketStatus | "all">("all");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchList = async (opts?: { search?: string; status?: SupportTicketStatus | "all" }) => {
    try {
      setLoading(true);
      setError("");
      const res = await supportAdminApi.listTickets({
        search: (opts?.search ?? search).trim() || undefined,
        status: (opts?.status ?? status) === "all" ? undefined : (opts?.status ?? status),
      });
      if (!res.success || !res.data) throw new Error(res.message || "Failed to load tickets");
      setTickets(res.data.items);
      setTotal(res.data.total);
    } catch (e: any) {
      setError(e.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const fetchOne = async (id: string) => {
    try {
      setSaving(true);
      setError("");
      const res = await supportAdminApi.getTicket(id);
      if (!res.success || !res.data) throw new Error(res.message || "Failed to load ticket");
      setSelected(res.data);
    } catch (e: any) {
      setError(e.message || "Failed to load ticket");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    fetchOne(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selectedShopName = useMemo(() => {
    const b = selected?.business;
    if (!b || typeof b === "string") return "";
    return b.name;
  }, [selected]);

  const selectedOwnerName = useMemo(() => {
    const o = selected?.owner;
    if (!o || typeof o === "string") return "";
    return o.name;
  }, [selected]);

  const selectedIssue = useMemo(() => {
    if (!selected) return "";
    return issueLabel[selected.issueType] || selected.issueType;
  }, [selected]);

  const selectedAssignedToName = useMemo(() => {
    const a = selected?.assignedTo;
    if (!a) return "—";
    if (typeof a === "string") return "—";
    return a.name || a.email || "—";
  }, [selected]);

  const onApplyFilters = async () => {
    await fetchList({ search, status });
    setSelectedId(null);
  };

  const onUpdateStatus = async (newStatus: SupportTicketStatus) => {
    if (!selected) return;
    try {
      setSaving(true);
      const res = await supportAdminApi.updateTicket(selected._id, { status: newStatus });
      if (!res.success || !res.data) throw new Error(res.message || "Failed to update status");
      setSelected(res.data);
      await fetchList();
    } catch (e: any) {
      setError(e.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const onAssignToMe = async () => {
    if (!selected || !user?._id) return;
    try {
      setSaving(true);
      const res = await supportAdminApi.updateTicket(selected._id, { assignedTo: user._id });
      if (!res.success || !res.data) throw new Error(res.message || "Failed to assign ticket");
      setSelected(res.data);
      await fetchList();
    } catch (e: any) {
      setError(e.message || "Failed to assign ticket");
    } finally {
      setSaving(false);
    }
  };

  const onUnassign = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const res = await supportAdminApi.updateTicket(selected._id, { assignedTo: null });
      if (!res.success || !res.data) throw new Error(res.message || "Failed to unassign ticket");
      setSelected(res.data);
      await fetchList();
    } catch (e: any) {
      setError(e.message || "Failed to unassign ticket");
    } finally {
      setSaving(false);
    }
  };

  const onSendReply = async () => {
    if (!selected) return;
    const msg = reply.trim();
    if (!msg) return;
    try {
      setSaving(true);
      const res = await supportAdminApi.addMessage(selected._id, msg);
      if (!res.success || !res.data) throw new Error(res.message || "Failed to send reply");
      setSelected(res.data);
      setReply("");
      await fetchList();
    } catch (e: any) {
      setError(e.message || "Failed to send reply");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
        <p className="text-sm text-muted-foreground">{total} tickets</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
          <Input
            placeholder="Search by shop/owner/phone/email/ticket id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:flex-1"
          />
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setSearch(""); setStatus("all"); fetchList({ search: "", status: "all" }); setSelectedId(null); }}>
              Reset
            </Button>
            <Button onClick={onApplyFilters}>Apply</Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Issue Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((t) => {
                  const business = typeof t.business === "string" ? null : t.business;
                  const shopName = business?.name || "—";
                  const assigned = typeof t.assignedTo === "string" ? null : t.assignedTo;
                  const assignedToName = assigned?.name || "—";
                  return (
                    <TableRow key={t._id} className={selectedId === t._id ? "bg-muted/40" : ""}>
                      <TableCell className="font-mono text-xs">{t.ticketId}</TableCell>
                      <TableCell className="text-sm">{shopName}</TableCell>
                      <TableCell className="text-sm">{issueLabel[t.issueType] || t.issueType}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="text-sm">{assignedToName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedId(t._id)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manage Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Ticket</p>
                <p className="text-sm font-semibold">{selected.ticketId}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Shop</p>
                <p className="text-sm font-semibold">{selectedShopName || "—"}</p>
                <p className="text-xs text-muted-foreground">Owner: {selectedOwnerName || "—"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Issue</p>
                <p className="text-sm font-semibold">{selectedIssue || "—"}</p>
                <p className="text-xs text-muted-foreground">Created: {new Date(selected.createdAt).toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <Select value={selected.status} onValueChange={(v) => onUpdateStatus(v as SupportTicketStatus)}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1 text-xs text-muted-foreground">
                Assigned To: <span className="text-foreground font-medium">{selectedAssignedToName}</span>
                {saving ? <span className="ml-2">Saving...</span> : null}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" disabled={saving || !user?._id} onClick={onAssignToMe}>Assign to me</Button>
                <Button variant="outline" disabled={saving} onClick={onUnassign}>Unassign</Button>
              </div>
            </div>

            <div className="rounded-xl border p-3 space-y-2 max-h-[320px] overflow-auto">
              {(selected.messages || []).map((m, idx) => (
                <div key={m._id || idx} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground capitalize">{m.senderRole}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(m.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.message}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a response..." rows={3} />
              <div className="flex items-center gap-2">
                <Button disabled={saving || !reply.trim()} onClick={onSendReply}>Send Reply</Button>
                <Button variant="outline" disabled={saving} onClick={() => { setSelectedId(null); setSelected(null); setReply(""); }}>
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
