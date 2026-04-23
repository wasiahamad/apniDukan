import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { businessApi, storiesApi, type Business, type StoryItem, type StoryKind, type StoryViewer } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const PLATFORM_LOGO_SRC = "/logo-removebg-preview.png";

type ViewerState = {
  open: boolean;
  index: number;
};

const getInitial = (name: string | null | undefined) => {
  const n = (name || "").trim();
  return n ? n.slice(0, 1).toUpperCase() : "U";
};

const getSafeLink = (value: string | null | undefined) => {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) return v;
  return null;
};

export default function StoriesPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [business, setBusiness] = useState<Business | null>(null);
  const [stories, setStories] = useState<StoryItem[]>([]);

  const [kind, setKind] = useState<StoryKind>("story");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [durationSec, setDurationSec] = useState<number>(5);
  const [linkUrl, setLinkUrl] = useState("");

  const [viewer, setViewer] = useState<ViewerState>({ open: false, index: 0 });
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);

  const [deleting, setDeleting] = useState(false);

  const activeStories = useMemo(() => stories.filter((s) => s.kind === kind), [stories, kind]);

  const refresh = async (businessId: string) => {
    const res = await storiesApi.listActive({ kind, businessId });
    if (res.success && res.data) {
      setStories(res.data);
    } else {
      setStories([]);
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
        setLoading(true);
        const res = await businessApi.getMyBusinesses();
        const b = res.success && res.data && res.data.length > 0 ? res.data[0] : null;
        if (!b) {
          navigate("/onboarding");
          return;
        }
        if (cancelled) return;
        setBusiness(b);

        const storiesRes = await storiesApi.listActive({ kind: "story", businessId: b._id });
        const reelsRes = await storiesApi.listActive({ kind: "reel", businessId: b._id });
        if (!cancelled) {
          const merged = [...(storiesRes.data || []), ...(reelsRes.data || [])];
          merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setStories(merged);
        }
      } catch (err: any) {
        toast({
          title: "Error",
          description: err?.message || "Failed to load stories",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate, toast]);

  useEffect(() => {
    if (!business?._id) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const storiesRes = await storiesApi.listActive({ kind: "story", businessId: business._id });
        const reelsRes = await storiesApi.listActive({ kind: "reel", businessId: business._id });
        if (cancelled) return;
        const merged = [...(storiesRes.data || []), ...(reelsRes.data || [])];
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setStories(merged);
      } catch {
        // ignore
      }
    };

    const id = window.setInterval(tick, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [business?._id]);

  const goNext = useCallback(() => {
    setViewer((v) => ({ ...v, index: Math.min(v.index + 1, Math.max(activeStories.length - 1, 0)) }));
  }, [activeStories.length]);

  const goPrev = useCallback(() => {
    setViewer((v) => ({ ...v, index: Math.max(v.index - 1, 0) }));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!viewer.open) return;
      if (e.key === "Escape") setViewer({ open: false, index: 0 });
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer.open, goNext, goPrev]);

  const selected = viewer.open ? activeStories[viewer.index] : null;

  const selectedViews = selected ? Number((selected as any).viewsCount || 0) : 0;

  useEffect(() => {
    if (!viewer.open || !selected?._id) {
      setViewers([]);
      setViewersLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setViewersLoading(true);
        const res = await storiesApi.listViewers(selected._id);
        if (cancelled) return;
        if (res.success && res.data) setViewers(res.data);
        else setViewers([]);
      } catch {
        if (!cancelled) setViewers([]);
      } finally {
        if (!cancelled) setViewersLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewer.open, selected?._id]);

  useEffect(() => {
    if (!viewer.open || !selected) {
      setProgress(0);
      return;
    }

    setProgress(0);

    if (selected.mediaType === "image") {
      const sec = typeof selected.durationSec === "number" && Number.isFinite(selected.durationSec)
        ? selected.durationSec
        : 5;
      const durationMs = Math.max(1, Math.min(60, Math.floor(sec))) * 1000;

      let raf = 0;
      const start = performance.now();
      const tick = (now: number) => {
        const next = Math.min(1, (now - start) / durationMs);
        setProgress(next);
        if (next >= 1) {
          if (viewer.index < activeStories.length - 1) goNext();
          else setViewer({ open: false, index: 0 });
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }

    const el = videoRef.current;
    if (!el) return;

    const update = () => {
      const d = el.duration;
      if (Number.isFinite(d) && d > 0) {
        setProgress(Math.min(1, el.currentTime / d));
      }
    };

    const onEnded = () => {
      if (viewer.index < activeStories.length - 1) goNext();
      else setViewer({ open: false, index: 0 });
    };

    el.addEventListener("timeupdate", update);
    el.addEventListener("loadedmetadata", update);
    el.addEventListener("ended", onEnded);
    // Try autoplay
    try {
      void el.play();
    } catch {
      // ignore
    }

    return () => {
      el.removeEventListener("timeupdate", update);
      el.removeEventListener("loadedmetadata", update);
      el.removeEventListener("ended", onEnded);
    };
  }, [viewer.open, viewer.index, selected?._id, activeStories.length, goNext]);

  const onUpload = async () => {
    if (!business?._id) return;
    if (!file) {
      toast({ title: "File required", description: "Image/Video select karo", variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      const normalizedLink = linkUrl.trim() ? linkUrl.trim() : null;
      const res = await storiesApi.create({
        file,
        caption: caption.trim() || undefined,
        kind,
        durationSec: kind === "story" ? durationSec : null,
        linkUrl: normalizedLink,
      });
      if (!res.success) throw new Error(res.message || "Upload failed");

      setFile(null);
      setCaption("");
      setDurationSec(5);
      setLinkUrl("");

      await refresh(business._id);

      toast({ title: "Uploaded", description: kind === "reel" ? "Reel uploaded" : "Story uploaded" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to upload", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const onDeleteSelected = async () => {
    if (!business?._id || !selected?._id) return;
    if (deleting) return;
    const ok = window.confirm("Delete this story/reel?\nYe action undo nahi hoga.");
    if (!ok) return;

    try {
      setDeleting(true);
      const res = await storiesApi.remove(selected._id);
      if (!res.success) throw new Error(res.message || "Delete failed");

      // Close viewer first (avoid index issues)
      setViewer({ open: false, index: 0 });
      setViewers([]);

      await refresh(business._id);
      toast({ title: "Deleted", description: "Story deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:px-8 lg:py-6">
        <Card>
          <CardHeader>
            <CardTitle>Stories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:px-8 lg:py-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stories & Reels</h1>
          <p className="text-sm text-muted-foreground">Instagram style: upload and preview your content.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
            <img src={business?.logo || PLATFORM_LOGO_SRC} alt={business?.name || "Business"} className="w-7 h-7 object-contain" />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={kind} onValueChange={(v) => setKind(v as StoryKind)}>
            <TabsList>
              <TabsTrigger value="story">Story (24h)</TabsTrigger>
              <TabsTrigger value="reel">Reel (no expiry)</TabsTrigger>
            </TabsList>
            <TabsContent value={kind} className="mt-3 space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Media</div>
                  <Input
                    type="file"
                    accept={kind === "reel" ? "video/*" : "image/*,video/*"}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <div className="text-xs text-muted-foreground">Supported: image/video. Reels are video-only.</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Caption</div>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a short caption..."
                    maxLength={500}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Duration (sec)</div>
                  <RadioGroup
                    value={String(durationSec)}
                    onValueChange={(v) => setDurationSec(Number(v) || 5)}
                    className="grid grid-cols-3 gap-3"
                    disabled={kind !== "story"}
                  >
                    {[5, 10, 15].map((sec) => (
                      <label
                        key={sec}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${kind !== "story" ? "opacity-50" : "cursor-pointer hover:bg-muted/30"}`}
                      >
                        <RadioGroupItem value={String(sec)} />
                        <span>{sec}s</span>
                      </label>
                    ))}
                  </RadioGroup>
                  <div className="text-xs text-muted-foreground">Only for stories (mainly images). Default 5 seconds.</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Link (Shop/Product)</div>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Paste your shop/product link (https://... or /shop/...)"
                    maxLength={2048}
                  />
                </div>
              </div>

              <Button onClick={onUpload} disabled={uploading || !file} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Upload {kind === "reel" ? "Reel" : "Story"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {activeStories.length === 0 ? (
            <div className="text-sm text-muted-foreground">No {kind === "reel" ? "reels" : "stories"} yet.</div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {activeStories.map((s, idx) => (
                <button
                  key={s._id}
                  className="shrink-0 w-[74px] text-left"
                  onClick={() => setViewer({ open: true, index: idx })}
                >
                  <div className="w-[74px] h-[74px] rounded-full p-[2px] bg-gradient-to-tr from-primary to-secondary">
                    <div className="w-full h-full rounded-full bg-background overflow-hidden">
                      {s.mediaType === "image" ? (
                        <img src={s.mediaUrl} alt="story" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <video
                          className="w-full h-full object-cover"
                          src={s.mediaUrl}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground truncate">{business?.name || "Your shop"}</div>
                  <div className="text-[10px] text-muted-foreground">{Number((s as any).viewsCount || 0)} views</div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Viewer overlay */}
      {viewer.open && selected && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setViewer({ open: false, index: 0 })}>
          <div className="w-full max-w-md h-[80vh] bg-black rounded-xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 z-20 px-3 pt-3">
              <div className="flex gap-1">
                {activeStories.map((_, i) => {
                  const filled = i < viewer.index ? 1 : i === viewer.index ? progress : 0;
                  return (
                    <div key={i} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
                      <div className="h-full bg-white" style={{ width: `${Math.max(0, Math.min(1, filled)) * 100}%` }} />
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              className="absolute top-3 right-3 z-30 rounded-full bg-black/60 p-2"
              onClick={() => setViewer({ open: false, index: 0 })}
              aria-label="Close"
            >
              <X className="h-4 w-4 text-white" />
            </button>

            <button
              className="absolute top-3 right-14 z-30 rounded-full bg-black/60 p-2 disabled:opacity-60"
              onClick={onDeleteSelected}
              disabled={deleting}
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 className="h-4 w-4 text-white" />
            </button>

            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                <img src={business?.logo || PLATFORM_LOGO_SRC} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="text-white text-sm font-semibold truncate">{business?.name || "Business"}</div>
                <div className="text-white/70 text-[11px] leading-none mt-1">{selectedViews} views</div>
              </div>
            </div>

            <div className="w-full h-full">
              {selected.mediaType === "image" ? (
                <img src={selected.mediaUrl} alt="" className="w-full h-full object-contain bg-black" />
              ) : (
                <video
                  src={selected.mediaUrl}
                  ref={videoRef}
                  className="w-full h-full object-contain bg-black"
                  autoPlay
                  playsInline
                />
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-20 p-3 text-white bg-gradient-to-t from-black/80 to-transparent">
              {getSafeLink(selected.linkUrl) ? (
                <a
                  href={getSafeLink(selected.linkUrl)!}
                  target={getSafeLink(selected.linkUrl)!.startsWith("http") ? "_blank" : undefined}
                  rel={getSafeLink(selected.linkUrl)!.startsWith("http") ? "noreferrer" : undefined}
                  className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open link
                </a>
              ) : null}
              {selected.caption ? (
                <div className="text-sm leading-snug mt-2">{selected.caption}</div>
              ) : null}

              <div className="mt-3">
                <div className="text-[11px] font-semibold text-white/80">Viewed by</div>
                {viewersLoading ? (
                  <div className="text-[11px] text-white/60 mt-2">Loading...</div>
                ) : viewers.length === 0 ? (
                  <div className="text-[11px] text-white/60 mt-2">No views yet</div>
                ) : (
                  <div className="mt-2 max-h-28 overflow-auto space-y-2 pr-1">
                    {viewers.map((v) => (
                      <div key={v.viewer._id} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-[11px] font-semibold">
                          {v.viewer.profileImage ? (
                            <img src={v.viewer.profileImage} alt={v.viewer.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white">{getInitial(v.viewer.name)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12px] text-white truncate leading-snug">{v.viewer.name}</div>
                          <div className="text-[11px] text-white/60 truncate leading-snug">{v.viewer.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="absolute inset-y-0 left-0 w-1/2 z-10" onClick={goPrev} />
            <div className="absolute inset-y-0 right-0 w-1/2 z-10" onClick={goNext} />
          </div>
        </div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground">
        Tip: Viewer me left/right click ya arrow keys se next/prev.
      </motion.div>
    </div>
  );
}
