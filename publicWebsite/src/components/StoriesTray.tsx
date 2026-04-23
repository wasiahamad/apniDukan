import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { markStoryViewed, type PublicStoryItem } from "@/lib/publicShopsApi";
import { useNavigate } from "react-router-dom";

const PLATFORM_LOGO_SRC = "/logo-removebg-preview.png";

type StoriesTrayProps = {
  stories: PublicStoryItem[];
  hideTray?: boolean;
  startOpen?: boolean;
  initialBusinessId?: string | null;
  onClose?: () => void;
};

type BusinessGroup = {
  businessId: string;
  businessName: string;
  businessLogo: string | null;
  stories: PublicStoryItem[];
};

function groupByBusiness(items: PublicStoryItem[]): BusinessGroup[] {
  const map = new Map<string, BusinessGroup>();
  items.forEach((s) => {
    const businessId = s.business?._id || s.businessId;
    const name = s.business?.name || "Shop";
    const logo = s.business?.logo || null;

    const prev = map.get(businessId);
    if (!prev) {
      map.set(businessId, {
        businessId,
        businessName: name,
        businessLogo: logo,
        stories: [s],
      });
    } else {
      prev.stories.push(s);
    }
  });

  // Keep each business stories latest-first
  map.forEach((g) => g.stories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

  // Order businesses by latest story
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.stories[0]?.createdAt || 0).getTime() - new Date(a.stories[0]?.createdAt || 0).getTime()
  );
}

const getSafeLink = (value: string | null | undefined) => {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) return v;
  return null;
};

const formatAgoShort = (iso: string | null | undefined) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const diffMs = Date.now() - t;
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatExpiresInShort = (iso: string | null | undefined) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const diffMs = t - Date.now();
  if (diffMs <= 0) return "expired";
  const mins = Math.ceil(diffMs / 60000);
  if (mins < 60) return `expires in ${mins}m`;
  const hours = Math.ceil(mins / 60);
  if (hours < 24) return `expires in ${hours}h`;
  const days = Math.ceil(hours / 24);
  return `expires in ${days}d`;
};

export default function StoriesTray({
  stories,
  hideTray = false,
  startOpen = false,
  initialBusinessId = null,
  onClose,
}: StoriesTrayProps) {
  const navigate = useNavigate();
  const groups = useMemo(() => groupByBusiness(stories), [stories]);

  const [open, setOpen] = useState(false);
  const [businessIndex, setBusinessIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeGroup = open ? groups[businessIndex] : null;
  const activeStory = activeGroup ? activeGroup.stories[storyIndex] : null;

  const closeViewer = useCallback(() => {
    setOpen(false);
    setProgress(0);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!startOpen) return;
    if (open) return;
    if (groups.length === 0) return;

    const idx = initialBusinessId
      ? groups.findIndex((g) => g.businessId === initialBusinessId)
      : -1;
    setBusinessIndex(idx >= 0 ? idx : 0);
    setStoryIndex(0);
    setOpen(true);
  }, [startOpen, open, groups, initialBusinessId]);

  const goNext = useCallback(() => {
    const g = groups[businessIndex];
    if (!g) return;
    if (storyIndex < g.stories.length - 1) {
      setStoryIndex((i) => i + 1);
      return;
    }
    if (businessIndex < groups.length - 1) {
      setBusinessIndex((i) => i + 1);
      setStoryIndex(0);
      return;
    }
    closeViewer();
  }, [groups, businessIndex, storyIndex, closeViewer]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      return;
    }
    if (businessIndex > 0) {
      const prev = groups[businessIndex - 1];
      setBusinessIndex((i) => i - 1);
      setStoryIndex(Math.max((prev?.stories.length || 1) - 1, 0));
    }
  }, [groups, businessIndex, storyIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeViewer, goNext, goPrev]);

  useEffect(() => {
    if (!open || !activeStory) {
      setProgress(0);
      return;
    }

    // Fire-and-forget: mark as viewed
    try {
      void markStoryViewed(activeStory._id);
    } catch {
      // ignore
    }

    setProgress(0);

    if (activeStory.mediaType === "image") {
      const sec = typeof activeStory.durationSec === "number" && Number.isFinite(activeStory.durationSec)
        ? activeStory.durationSec
        : 5;
      const durationMs = Math.max(1, Math.min(60, Math.floor(sec))) * 1000;

      let raf = 0;
      const start = performance.now();
      const tick = (now: number) => {
        const next = Math.min(1, (now - start) / durationMs);
        setProgress(next);
        if (next >= 1) {
          goNext();
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
    const onEnded = () => goNext();

    el.addEventListener("timeupdate", update);
    el.addEventListener("loadedmetadata", update);
    el.addEventListener("ended", onEnded);
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
  }, [open, activeStory?._id, activeStory?.mediaType, goNext]);

  if (groups.length === 0) return null;

  if (hideTray && !open) return null;

  const activeBizSlug = activeStory?.business?.slug || null;
  const postedAgo = activeStory ? formatAgoShort(activeStory.createdAt) : null;
  const expiresIn = activeStory?.kind === "story" ? formatExpiresInShort(activeStory.expiresAt) : null;

  return (
    <>
      {!hideTray ? (
        <div className="flex gap-3 overflow-x-auto pb-2 pt-4">
          {groups.map((g, idx) => (
            <button
              key={g.businessId}
              className="shrink-0 w-[74px] text-left"
              onClick={() => {
                setBusinessIndex(idx);
                setStoryIndex(0);
                setOpen(true);
              }}
              aria-label={`Open stories for ${g.businessName}`}
            >
              <div className="w-[74px] h-[74px] rounded-full p-[2px] bg-gradient-to-tr from-primary to-secondary">
                <div className="w-full h-full rounded-full bg-background overflow-hidden">
                  {/* Thumb: use first story media */}
                  {g.stories[0]?.mediaType === "image" ? (
                    <img
                      src={g.stories[0].mediaUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <video
                      className="w-full h-full object-cover"
                      src={g.stories[0]?.mediaUrl}
                      muted
                      playsInline
                      preload="metadata"
                    />
                  )}
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground truncate">{g.businessName}</div>
            </button>
          ))}
        </div>
      ) : null}

      {open && activeStory && activeGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={closeViewer}>
          <div className="w-full max-w-md h-[80vh] bg-black rounded-xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-3 right-3 z-30 rounded-full bg-black/60 p-2"
              onClick={closeViewer}
              aria-label="Close"
            >
              <X className="h-4 w-4 text-white" />
            </button>

            {/* Progress bars */}
            <div className="absolute top-0 left-0 right-0 z-20 px-3 pt-3">
              <div className="flex gap-1">
                {activeGroup.stories.map((_, i) => {
                  const filled = i < storyIndex ? 1 : i === storyIndex ? progress : 0;
                  return (
                    <div key={i} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
                      <div className="h-full bg-white" style={{ width: `${Math.max(0, Math.min(1, filled)) * 100}%` }} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                <img
                  src={activeGroup.businessLogo || PLATFORM_LOGO_SRC}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <button
                  type="button"
                  className={
                    "text-white text-sm font-semibold truncate text-left " +
                    (activeBizSlug ? "hover:underline underline-offset-4" : "cursor-default")
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!activeBizSlug) return;
                    closeViewer();
                    navigate(`/${activeBizSlug}`);
                  }}
                >
                  {activeGroup.businessName}
                </button>
                {(postedAgo || expiresIn) ? (
                  <div className="text-white/70 text-[11px] leading-none mt-1">
                    {[postedAgo, expiresIn].filter(Boolean).join(" • ")}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="w-full h-full">
              {activeStory.mediaType === "image" ? (
                <img src={activeStory.mediaUrl} alt="" className="w-full h-full object-contain bg-black" />
              ) : (
                <video
                  src={activeStory.mediaUrl}
                  ref={videoRef}
                  className="w-full h-full object-contain bg-black"
                  autoPlay
                  playsInline
                  muted
                />
              )}
            </div>

            {(activeStory.caption || getSafeLink(activeStory.linkUrl)) ? (
              <div className="absolute bottom-0 left-0 right-0 z-20 p-3 text-white bg-gradient-to-t from-black/80 to-transparent">
                {getSafeLink(activeStory.linkUrl) ? (
                  <a
                    href={getSafeLink(activeStory.linkUrl)!}
                    target={getSafeLink(activeStory.linkUrl)!.startsWith("http") ? "_blank" : undefined}
                    rel={getSafeLink(activeStory.linkUrl)!.startsWith("http") ? "noreferrer" : undefined}
                    className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open link
                  </a>
                ) : null}
                {activeStory.caption ? (
                  <div className="text-sm leading-snug mt-2">{activeStory.caption}</div>
                ) : null}
              </div>
            ) : null}

            {/* Click areas for next/prev */}
            <div
              className="absolute inset-y-0 left-0 w-1/2 z-10"
              onClick={goPrev}
            />
            <div
              className="absolute inset-y-0 right-0 w-1/2 z-10"
              onClick={goNext}
            />
          </div>
        </div>
      )}
    </>
  );
}
