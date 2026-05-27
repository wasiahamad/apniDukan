import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { setupFirebasePushNotifications } from "@/lib/firebaseMessaging";

export default function NotificationsPage() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  const canRequest = useMemo(() => permission !== "granted", [permission]);

  const enable = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await setupFirebasePushNotifications();
      if (!res.supported) {
        setError(res.reason);
        return;
      }
      setPermission(res.permission);
      if (res.token) setToken(res.token);
      if (res.permission === "granted" && !res.firebaseConfigured) {
        setError("Permission granted. Next: add Firebase SDK + env vars to enable push delivery.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enable notifications");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <section className="container py-8">
        <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Enable notifications to get updates about nearby shops, offers, and important alerts.
        </p>

        <div className="mt-6 grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Permission status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                Current: <span className="font-medium">{permission}</span>
              </p>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex items-center gap-2">
                <Button onClick={enable} disabled={!canRequest || loading}>
                  {loading ? "Enabling…" : permission === "granted" ? "Enabled" : "Enable Notifications"}
                </Button>
                {permission === "granted" ? (
                  <span className="text-sm text-muted-foreground">You’re all set.</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Browser will ask for permission.</span>
                )}
              </div>

              {token ? (
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">FCM token (dev/debug)</p>
                  <p className="text-xs break-all mt-1">{token}</p>
                </div>
              ) : null}

              <p className="text-xs text-muted-foreground">
                Note: Full push delivery requires Firebase setup (env vars + SDK + backend integration).
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </PageTransition>
  );
}
