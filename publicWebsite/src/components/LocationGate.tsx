import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserLocation } from "@/hooks/useUserLocation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

  // Force everyone onto home until location is granted.
  if (mustBlock && pathname !== "/") {
    return <Navigate to="/" replace />;
  }

  const description = useMemo(() => {
    if (loading) return "Location detect ho rahi hai…";
    if (permissionDenied) return "Location permission denied hai. Continue karne ke liye browser me Location Allow kijiye.";
    if (requestedOnce) return "Continue karne ke liye location access allow kijiye.";
    return "Continue karne ke liye location access allow karna zaroori hai.";
  }, [loading, permissionDenied, requestedOnce]);

  // Keep dialog open until location is available.
  return (
    <Dialog open={mustBlock} onOpenChange={() => {}}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] max-w-md rounded-2xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Required
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error && !loading ? <div className="text-sm text-destructive">{String(error)}</div> : null}

        <div className="pt-2">
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
                Detecting…
              </span>
            ) : (
              "Allow Location"
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Aap bina location ke website use nahi kar sakte.
        </div>
      </DialogContent>
    </Dialog>
  );
}
