import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserLocation } from "@/hooks/useUserLocation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin } from "lucide-react";

/**
 * LocationGate
 * - Shows a blocking modal on the home page (/) asking for location permission.
 * - Until the user grants location, all other routes redirect to "/".
 */
export default function LocationGate() {
  const { pathname } = useLocation();
  const { userLocation, requestLocation, loading, permissionDenied, error } = useUserLocation();
  const [requestedOnce, setRequestedOnce] = useState(false);

  const mustBlock = !userLocation;

  const isShopSubdomainHost = useMemo(() => {
    if (typeof window === "undefined") return false;
    const hostname = String(window.location.hostname || "").toLowerCase();
    const suffix = ".publicdukan.com";
    if (!hostname.endsWith(suffix)) return false;
    const sub = hostname.slice(0, -suffix.length);
    const shopSlug = (sub.split(".")[0] || "").trim();
    if (!shopSlug) return false;
    return !["www", "seller", "admin", "api"].includes(shopSlug);
  }, []);

  const description = useMemo(() => {
    if (loading) return "Location detect ho rahi hai...";
    if (permissionDenied) return "Location permission denied hai. Browser settings me allow kijiye.";
    if (requestedOnce) return "Continue karne ke liye location access allow kijiye.";
    return "Nearby dukandars dikhane ke liye location access required hai.";
  }, [loading, permissionDenied, requestedOnce]);

  // Force everyone onto home until location is granted.
  // NOTE: On shop subdomains, SubdomainShopRedirect forces /:shopSlug.
  // If we also redirect to '/', it creates a navigation loop and spams API calls.
  if (mustBlock && pathname !== "/" && !isShopSubdomainHost) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (!mustBlock) return;
    if (requestedOnce) return;
    try {
      requestLocation();
      setRequestedOnce(true);
    } catch {
      // ignore
    }
  }, [mustBlock, requestedOnce, requestLocation]);

  // Keep dialog open until location is available.
  return (
    <Dialog open={mustBlock} onOpenChange={() => {}}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] max-w-md rounded-3xl border-0 bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-0"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="rounded-3xl border bg-card/90 p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Location Required
              </DialogTitle>
              <Badge className="bg-primary/10 text-primary border-primary/20">Live</Badge>
            </div>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-2xl border bg-background/70 p-4">
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Nearest dukandars first
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                Accurate distance + ETA
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent" />
                One-tap navigation
              </div>
            </div>
          </div>

          {error && !loading ? <div className="mt-3 text-sm text-destructive">{String(error)}</div> : null}

          <div className="pt-4">
            <Button
              className="w-full"
              onClick={() => {
                setRequestedOnce(true);
                requestLocation();
              }}
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Detecting...
                </span>
              ) : (
                "Allow Location"
              )}
            </Button>
          </div>

          {permissionDenied ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Browser me address bar ke lock icon par click karke Location allow kijiye.
            </div>
          ) : null}

          <div className="mt-4 text-xs text-muted-foreground">
            Aap bina location ke website use nahi kar sakte.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
