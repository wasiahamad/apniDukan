import PageTransition from "@/components/PageTransition";
import StoriesTray from "@/components/StoriesTray";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchActiveStories, markStoryViewed, type PublicStoryItem } from "@/lib/publicShopsApi";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const PLATFORM_LOGO_SRC = "/logo-removebg-preview.png";

const getSafeLink = (value: string | null | undefined) => {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) return v;
  return null;
};

type ReelViewerState = {
  open: boolean;
  index: number;
};

export default function StoriesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const formatAgoShort = (iso: string | null | undefined) => {
    if (!iso) return null;
    const timeMs = new Date(iso).getTime();
    if (!Number.isFinite(timeMs)) return null;
    const diffMs = Date.now() - timeMs;
    if (diffMs < 0) return t("storiesPage.time.justNow");
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t("storiesPage.time.justNow");
    if (mins < 60) return t("storiesPage.time.minutesAgo", { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("storiesPage.time.hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    return t("storiesPage.time.daysAgo", { count: days });
  };
  const storiesQuery = useQuery({
    queryKey: ["public-stories", "story"],
    queryFn: () => fetchActiveStories("story"),
  });

  const reelsQuery = useQuery({
    queryKey: ["public-stories", "reel"],
    queryFn: () => fetchActiveStories("reel"),
  });

  const reels = useMemo(() => (reelsQuery.data || []).filter((r) => r.kind === "reel"), [reelsQuery.data]);

  const [viewer, setViewer] = useState<ReelViewerState>({ open: false, index: 0 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!viewer.open) return;
      if (e.key === "Escape") setViewer({ open: false, index: 0 });
      if (e.key === "ArrowRight") setViewer((v) => ({ ...v, index: Math.min(v.index + 1, reels.length - 1) }));
      if (e.key === "ArrowLeft") setViewer((v) => ({ ...v, index: Math.max(v.index - 1, 0) }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer.open, reels.length]);

  const activeReel: PublicStoryItem | null = viewer.open ? reels[viewer.index] || null : null;

  useEffect(() => {
    if (!viewer.open || !activeReel?._id) return;
    try {
      void markStoryViewed(activeReel._id);
    } catch {
      // ignore
    }
  }, [viewer.open, activeReel?._id]);

  const isLoading = storiesQuery.isLoading || reelsQuery.isLoading;

  return (
    <PageTransition>
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("storiesPage.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("storiesPage.subtitle")}</p>
        </div>

        {/* Stories */}
        <Card>
          <CardHeader>
            <CardTitle>{t("storiesPage.sections.stories")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="shrink-0">
                    <Skeleton className="h-[74px] w-[74px] rounded-full" />
                    <Skeleton className="mt-2 h-3 w-[70px]" />
                  </div>
                ))}
              </div>
            ) : Array.isArray(storiesQuery.data) && storiesQuery.data.length > 0 ? (
              <StoriesTray stories={storiesQuery.data} />
            ) : (
              <div className="text-sm text-muted-foreground">{t("storiesPage.empty.stories")}</div>
            )}
          </CardContent>
        </Card>

        {/* Reels */}
        <Card>
          <CardHeader>
            <CardTitle>{t("storiesPage.sections.reels")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-[240px] w-full rounded-xl" />
                ))}
              </div>
            ) : reels.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t("storiesPage.empty.reels")}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {reels.map((r, idx) => {
                  const bizName = r.business?.name || t("storiesPage.fallbackShop");
                  const bizLogo = r.business?.logo || null;
                  return (
                    <button
                      key={r._id}
                      className="text-left rounded-xl border bg-card overflow-hidden hover:bg-muted/30 transition-colors"
                      onClick={() => setViewer({ open: true, index: idx })}
                    >
                      <div className="aspect-[9/16] bg-black">
                        <video
                          src={r.mediaUrl}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      </div>
                      <div className="p-3 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
                          <img
                            src={bizLogo || PLATFORM_LOGO_SRC}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{bizName}</div>
                          {r.caption ? <div className="text-xs text-muted-foreground truncate">{r.caption}</div> : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reel Viewer */}
      {viewer.open && activeReel && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setViewer({ open: false, index: 0 })}>
          <div className="w-full max-w-md h-[80vh] bg-black rounded-xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-3 right-3 z-30 rounded-full bg-black/60 p-2"
              onClick={() => setViewer({ open: false, index: 0 })}
              aria-label={t("storiesPage.actions.close")}
            >
              <X className="h-4 w-4 text-white" />
            </button>

            <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                <img src={activeReel.business?.logo || PLATFORM_LOGO_SRC} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <button
                  type="button"
                  className={
                    "text-white text-sm font-semibold truncate text-left " +
                    (activeReel.business?.slug ? "hover:underline underline-offset-4" : "cursor-default")
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    const slug = activeReel.business?.slug;
                    if (!slug) return;
                    setViewer({ open: false, index: 0 });
                    navigate(`/${slug}`);
                  }}
                >
                  {activeReel.business?.name || t("storiesPage.fallbackShop")}
                </button>
                {formatAgoShort(activeReel.createdAt) ? (
                  <div className="text-white/70 text-[11px] leading-none mt-1">{formatAgoShort(activeReel.createdAt)}</div>
                ) : null}
              </div>
            </div>

            <div className="w-full h-full">
              <video
                src={activeReel.mediaUrl}
                className="w-full h-full object-contain bg-black"
                controls
                autoPlay
                playsInline
              />
            </div>

            {(activeReel.caption || getSafeLink(activeReel.linkUrl)) ? (
              <div className="absolute bottom-0 left-0 right-0 z-20 p-3 text-white bg-gradient-to-t from-black/80 to-transparent">
                {getSafeLink(activeReel.linkUrl) ? (
                  <a
                    href={getSafeLink(activeReel.linkUrl)!}
                    target={getSafeLink(activeReel.linkUrl)!.startsWith("http") ? "_blank" : undefined}
                    rel={getSafeLink(activeReel.linkUrl)!.startsWith("http") ? "noreferrer" : undefined}
                    className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t("storiesPage.actions.openLink")}
                  </a>
                ) : null}
                {activeReel.caption ? (
                  <div className={`text-sm leading-snug ${getSafeLink(activeReel.linkUrl) ? "mt-2" : ""}`}>{activeReel.caption}</div>
                ) : null}
              </div>
            ) : null}

            <div className="absolute inset-y-0 left-0 w-1/2 z-10" onClick={() => setViewer((v) => ({ ...v, index: Math.max(v.index - 1, 0) }))} />
            <div className="absolute inset-y-0 right-0 w-1/2 z-10" onClick={() => setViewer((v) => ({ ...v, index: Math.min(v.index + 1, reels.length - 1) }))} />
          </div>
        </div>
      )}
    </PageTransition>
  );
}
