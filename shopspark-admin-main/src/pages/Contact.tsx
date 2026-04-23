import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { contactAdminApi, type AdminContactMessage, type AdminContactSettings } from "@/lib/api";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(iso);
  }
};

export default function Contact() {
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settings, setSettings] = useState<AdminContactSettings>({ whatsappNumber: "", email: "", officeAddress: "" });

  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState("");
  const [messages, setMessages] = useState<AdminContactMessage[]>([]);
  const [total, setTotal] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminContactMessage | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [messageSaving, setMessageSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      setSettingsError("");
      const res = await contactAdminApi.getSettings();
      if (!res.success || !res.data) throw new Error(res.message || "Failed to load contact settings");
      setSettings(res.data);
    } catch (e: any) {
      setSettingsError(e.message || "Failed to load contact settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setMessagesLoading(true);
      setMessagesError("");
      const res = await contactAdminApi.listMessages({ page: 1, limit: 50 });
      if (!res.success || !res.data) throw new Error(res.message || "Failed to load messages");
      setMessages(res.data.items);
      setTotal(res.data.total);
    } catch (e: any) {
      setMessagesError(e.message || "Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchOne = async (id: string) => {
    try {
      setMessageSaving(true);
      setMessagesError("");
      const res = await contactAdminApi.getMessage(id);
      if (!res.success || !res.data) throw new Error(res.message || "Failed to load message");
      setSelected(res.data);
      setNoteDraft(res.data.adminNote || "");
    } catch (e: any) {
      setMessagesError(e.message || "Failed to load message");
    } finally {
      setMessageSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setNoteDraft("");
      return;
    }
    fetchOne(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const onSaveSettings = async () => {
    try {
      setSettingsSaving(true);
      setSettingsError("");
      const res = await contactAdminApi.updateSettings(settings);
      if (!res.success || !res.data) throw new Error(res.message || "Failed to save settings");
      setSettings(res.data);
    } catch (e: any) {
      setSettingsError(e.message || "Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  const onSaveNote = async () => {
    if (!selected) return;
    try {
      setMessageSaving(true);
      const res = await contactAdminApi.updateMessage(selected._id, { adminNote: noteDraft });
      if (!res.success || !res.data) throw new Error(res.message || "Failed to update message");
      setSelected(res.data);
      await fetchMessages();
    } catch (e: any) {
      setMessagesError(e.message || "Failed to update message");
    } finally {
      setMessageSaving(false);
    }
  };

  const onToggleResolved = async () => {
    if (!selected) return;
    const next = selected.status === "resolved" ? "open" : "resolved";
    try {
      setMessageSaving(true);
      const res = await contactAdminApi.updateMessage(selected._id, { status: next });
      if (!res.success || !res.data) throw new Error(res.message || "Failed to update status");
      setSelected(res.data);
      await fetchMessages();
    } catch (e: any) {
      setMessagesError(e.message || "Failed to update status");
    } finally {
      setMessageSaving(false);
    }
  };

  const selectedMeta = useMemo(() => selected?.metadata || null, [selected]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contact</h1>
        <p className="text-sm text-muted-foreground">Manage contact page info and solve incoming messages</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Page Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>WhatsApp Number</Label>
                <Input
                  value={settings.whatsappNumber}
                  onChange={(e) => setSettings((p) => ({ ...p, whatsappNumber: e.target.value }))}
                  placeholder="e.g. 919876543210"
                />
                <p className="text-xs text-muted-foreground">Use country code, without + (example: 91xxxxxxxxxx)</p>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={settings.email}
                  onChange={(e) => setSettings((p) => ({ ...p, email: e.target.value }))}
                  placeholder="support@publicdukan.in"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Office Address</Label>
                <Textarea
                  value={settings.officeAddress}
                  onChange={(e) => setSettings((p) => ({ ...p, officeAddress: e.target.value }))}
                  rows={3}
                  placeholder="Office address shown on contact page"
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button onClick={onSaveSettings} disabled={settingsSaving}>
                  {settingsSaving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={fetchSettings} disabled={settingsSaving}>
                  Refresh
                </Button>
              </div>
              {settingsError ? (
                <div className="md:col-span-2 text-sm text-destructive">{settingsError}</div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {messagesError ? (
              <div className="p-4 text-sm text-destructive">{messagesError}</div>
            ) : null}
            <div className="px-4 pb-2 text-sm text-muted-foreground">{total} total</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messagesLoading ? (
                  Array.from({ length: 7 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : messages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      No messages yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map((m) => (
                    <TableRow
                      key={m._id}
                      className={`cursor-pointer ${selectedId === m._id ? "bg-muted/40" : ""}`}
                      onClick={() => setSelectedId(m._id)}
                    >
                      <TableCell className="text-sm font-medium">{m.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.email}</TableCell>
                      <TableCell><StatusBadge status={m.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString("en-IN")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Message Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <div className="text-sm text-muted-foreground">Select a message to view details.</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{selected.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{selected.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Received: {fmtDate(selected.createdAt)}</p>
                    {selected.resolvedAt ? (
                      <p className="text-xs text-muted-foreground">Resolved: {fmtDate(selected.resolvedAt)}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={selected.status} />
                  </div>
                </div>

                <div className="bg-muted/30 border rounded-xl p-3 text-sm whitespace-pre-wrap">
                  {selected.message}
                </div>

                <div className="space-y-2">
                  <Label>Admin Note</Label>
                  <Textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={4}
                    placeholder="Add internal note / resolution details"
                    disabled={messageSaving}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onSaveNote} disabled={messageSaving}>
                      {messageSaving ? "Saving..." : "Save Note"}
                    </Button>
                    <Button onClick={onToggleResolved} disabled={messageSaving}>
                      {selected.status === "resolved" ? "Reopen" : "Mark Resolved"}
                    </Button>
                  </div>
                </div>

                {selectedMeta ? (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Source: {selectedMeta.source || "—"}</div>
                    <div>IP: {selectedMeta.ipAddress || "—"}</div>
                    <div>User-Agent: {selectedMeta.userAgent || "—"}</div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
