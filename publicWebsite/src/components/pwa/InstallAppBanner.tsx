import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const STORAGE_KEY = "publicdukan:pwa:installBannerDismissed:v1";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)");
  const standaloneDisplayMode = Boolean(mql?.matches);
  const iosStandalone = Boolean((navigator as any)?.standalone);
  return standaloneDisplayMode || iosStandalone;
}

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebkit = /WebKit/.test(ua);
  const isChrome = /CriOS/.test(ua);
  const isFirefox = /FxiOS/.test(ua);
  return isIOS && isWebkit && !isChrome && !isFirefox;
}

export default function InstallAppBanner({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      deferredRef.current = promptEvent;
      setDeferred(promptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onInstalled = () => {
      setInstalled(true);
      deferredRef.current = null;
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onInstallRequest = async () => {
      const promptEvent = deferredRef.current;
      if (!promptEvent) return;
      await promptEvent.prompt();
      try {
        await promptEvent.userChoice;
      } catch {
        // ignore
      }
      deferredRef.current = null;
      setDeferred(null);
    };

    window.addEventListener("publicdukan:pwa:install-request", onInstallRequest);
    return () => window.removeEventListener("publicdukan:pwa:install-request", onInstallRequest);
  }, []);

  const show = useMemo(() => {
    if (installed) return false;
    if (dismissed) return false;
    if (isStandaloneMode()) return false;
    // Android/desktop: show when install prompt is available.
    if (deferred) return true;
    // iOS Safari: show instructions (no beforeinstallprompt).
    if (isIosSafari()) return true;
    return false;
  }, [deferred, dismissed, installed]);

  const onDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  const onInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      // ignore
    }
    deferredRef.current = null;
    setDeferred(null);
  };

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className={cn(
            "md:hidden fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 px-3",
            className
          )}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div className="mx-auto max-w-md rounded-2xl border bg-card/95 backdrop-blur-xl shadow-sm p-3">
            <div className="flex items-start gap-3">
              <img
                src="/pwa-64x64.png"
                alt=""
                className="h-10 w-10 rounded-xl border bg-background object-cover"
                loading="eager"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">Install PublicDukan</p>
                {deferred ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add the app for faster access and offline support.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    On iPhone: tap Share → “Add to Home Screen”.
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  {deferred ? (
                    <Button size="sm" className="h-8" onClick={onInstall}>
                      Install
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" className="h-8" onClick={onDismiss}>
                    Not now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
