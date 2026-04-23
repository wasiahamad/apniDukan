import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { storiesAdminApi, type StoryItem, type StoryKind } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

type ViewerState = { open: boolean; index: number };

const getSafeLink = (value: string | null | undefined) => {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) return v;
  return null;
};

export default function Stories() {
  const { toast } = useToast();

  const [kind, setKind] = useState<StoryKind>("story");
  const [businessIdFilter, setBusinessIdFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [stories, setStories] = useState<StoryItem[]>([]);

  // Create
  const [createBusinessId, setCreateBusinessId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [durationSec, setDurationSec] = useState<number>(5);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Viewer/Edit
  const [viewer, setViewer] = useState<ViewerState>({ open: false, index: 0 });
  const selected = viewer.open ? stories[viewer.index] : null;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [editingCaption, setEditingCaption] = useState("");
  const [editingLinkUrl, setEditingLinkUrl] = useState("");
  const [editingDurationSec, setEditingDurationSec] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filterBusinessId = businessIdFilter.trim();

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await storiesAdminApi.listActive({ kind, businessId: filterBusinessId || undefined });
      if (!res.success) throw new Error(res.message || "Failed to load stories");
      setStories(res.data || []);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to load stories", variant: "destructive" });
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => {
    if (!selected) return;
    setEditingCaption(selected.caption || "");
    setEditingLinkUrl(selected.linkUrl || "");
    setEditingDurationSec(selected.kind === "story" ? (selected.durationSec ?? 5) : null);

    if (selected.mediaType === "video") {
      const el = videoRef.current;
      try {
        void el?.play();
      } catch {
        // ignore
      }
    }
  }, [selected?._id]);

  const onCreate = async () => {
    const bizId = createBusinessId.trim();
    if (!bizId) {
      toast({ title: "BusinessId required", description: "Story create karne ke liye businessId do.", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "File required", description: "Image/Video select karo", variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      const normalizedLink = linkUrl.trim() ? linkUrl.trim() : null;
      const res = await storiesAdminApi.create({
        businessId: bizId,
        file,
        caption: caption.trim() || undefined,
        kind,
        durationSec: kind === "story" ? durationSec : null,
        linkUrl: normalizedLink,
      });
      if (!res.success) throw new Error(res.message || "Upload failed");

      setFile(null);
      setCaption("");
      setLinkUrl("");
      setDurationSec(5);

      await refresh();
      toast({ title: "Uploaded", description: kind === "reel" ? "Reel uploaded" : "Story uploaded" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to upload", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!selected?._id) return;
    if (saving) return;

    try {
      setSaving(true);
      const payload: { caption?: string; linkUrl?: string | null; durationSec?: number | null } = {
        caption: editingCaption,
        linkUrl: editingLinkUrl.trim() ? editingLinkUrl.trim() : null,
      };
      if (selected.kind === "story") payload.durationSec = typeof editingDurationSec === "number" ? editingDurationSec : null;

      const res = await storiesAdminApi.update(selected._id, payload);
      if (!res.success) throw new Error(res.message || "Update failed");

      await refresh();
      toast({ title: "Saved", description: "Story updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!selected?._id) return;
    if (deleting) return;
    const ok = window.confirm("Delete this story/reel?\nYe action undo nahi hoga.");
    if (!ok) return;

    try {
      setDeleting(true);
      const res = await storiesAdminApi.remove(selected._id);
      if (!res.success) throw new Error(res.message || "Delete failed");

      setViewer({ open: false, index: 0 });
      await refresh();
      toast({ title: "Deleted", description: "Story deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const title = useMemo(() => (kind === "reel" ? "Reels" : "Stories"), [kind]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stories & Reels</h1>
          <p className="text-sm text-muted-foreground">Super admin view + CRUD (admin views are not counted as viewers).</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create {kind === "reel" ? "Reel" : "Story"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={kind} onValueChange={(v) => setKind(v as StoryKind)}>
            <TabsList>
              <TabsTrigger value="story">Story (24h)</TabsTrigger>
              <TabsTrigger value="reel">Reel (no expiry)</TabsTrigger>
            </TabsList>
            <TabsContent value={kind} className="mt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Business ID</div>
                  <Input value={createBusinessId} onChange={(e) => setCreateBusinessId(e.target.value)} placeholder="Mongo businessId" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Media</div>
                  <Input type="file" accept={kind === "reel" ? "video/*" : "image/*,video/*"} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  <div className="text-xs text-muted-foreground">Supported: image/video. Reels are video-only.</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Caption</div>
                  <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} placeholder="Write a short caption..." />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Link (Shop/Product)</div>
                  <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} maxLength={2048} placeholder="https://... or /shop/..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Duration (sec)</div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={durationSec}
                    disabled={kind !== "story"}
                    onChange={(e) => setDurationSec(Math.max(1, Math.min(60, Number(e.target.value) || 5)))}
                  />
                  <div className="text-xs text-muted-foreground">Only for stories. 1–60 seconds.</div>
                </div>
              </div>

              <Button onClick={onCreate} disabled={uploading || !file} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Upload {kind === "reel" ? "Reel" : "Story"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>{title}</span>
            <div className="flex items-center gap-2">
              <Input
                className="w-64"
                placeholder="Filter by businessId (optional)"
                value={businessIdFilter}
                onChange={(e) => setBusinessIdFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") refresh();
                }}
              />
              <Button variant="outline" onClick={refresh} disabled={loading}>Apply</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : stories.length === 0 ? (
            <div className="text-sm text-muted-foreground">No {kind === "reel" ? "reels" : "stories"} found.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {stories.map((s, idx) => (
                <button
                  key={s._id}
                  className="rounded-lg border overflow-hidden text-left hover:bg-accent/30"
                  onClick={() => setViewer({ open: true, index: idx })}
                >
                  <div className="aspect-[3/4] bg-black">
                    {s.mediaType === "image" ? (
                      <img src={s.mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <video src={s.mediaUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-medium truncate">{s.business?.name || s.businessId}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{s.caption || "(no caption)"}</div>
                    <div className="text-[11px] text-muted-foreground">{Number(s.viewsCount || 0)} views</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {viewer.open && selected ? (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setViewer({ open: false, index: 0 })}>
          <div className="w-full max-w-3xl h-[80vh] bg-black rounded-xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3 right-3 z-30 rounded-full bg-black/60 p-2" onClick={() => setViewer({ open: false, index: 0 })} aria-label="Close">
              <X className="h-4 w-4 text-white" />
            </button>

            <button
              className="absolute top-3 right-14 z-30 rounded-full bg-black/60 p-2 disabled:opacity-60"
              onClick={onDelete}
              disabled={deleting}
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 className="h-4 w-4 text-white" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
              <div className="bg-black">
                {selected.mediaType === "image" ? (
                  <img src={selected.mediaUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <video ref={videoRef} src={selected.mediaUrl} className="w-full h-full object-contain" controls playsInline />
                )}
              </div>

              <div className="bg-background text-foreground p-4 overflow-auto">
                <div className="text-sm font-semibold">{selected.business?.name || selected.businessId}</div>
                <div className="text-xs text-muted-foreground mt-1">{Number(selected.viewsCount || 0)} views</div>

                {getSafeLink(selected.linkUrl) ? (
                  <a
                    href={getSafeLink(selected.linkUrl)!}
                    target={getSafeLink(selected.linkUrl)!.startsWith("http") ? "_blank" : undefined}
                    rel={getSafeLink(selected.linkUrl)!.startsWith("http") ? "noreferrer" : undefined}
                    className="inline-flex mt-3 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent"
                  >
                    Open link
                  </a>
                ) : null}

                <div className="mt-4 space-y-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Caption</div>
                    <Textarea value={editingCaption} onChange={(e) => setEditingCaption(e.target.value)} maxLength={500} />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Link URL</div>
                    <Input value={editingLinkUrl} onChange={(e) => setEditingLinkUrl(e.target.value)} maxLength={2048} />
                  </div>

                  {selected.kind === "story" ? (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Duration (sec)</div>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={editingDurationSec ?? 5}
                        onChange={(e) => setEditingDurationSec(Math.max(1, Math.min(60, Number(e.target.value) || 5)))}
                      />
                    </div>
                  ) : null}

                  <Button onClick={onSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
