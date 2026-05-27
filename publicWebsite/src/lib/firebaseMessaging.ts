type MessagingSetupResult =
  | { supported: false; reason: string }
  | { supported: true; permission: NotificationPermission; firebaseConfigured: boolean; token?: string };

const getFirebaseEnv = () => {
  const apiKey = (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim();
  const authDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim();
  const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim();
  const storageBucket = (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined)?.trim();
  const messagingSenderId = (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined)?.trim();
  const appId = (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim();
  const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined)?.trim();

  const ready = Boolean(apiKey && authDomain && projectId && messagingSenderId && appId && vapidKey);

  return {
    ready,
    config: {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    },
    vapidKey,
  };
};

export async function setupFirebasePushNotifications(): Promise<MessagingSetupResult> {
  if (typeof window === "undefined") {
    return { supported: false, reason: "Not in browser" };
  }

  if (!("Notification" in window)) {
    return { supported: false, reason: "Notifications not supported" };
  }

  // Firebase Messaging requires HTTPS (or localhost) and Service Worker.
  if (!window.isSecureContext) {
    return { supported: false, reason: "Requires HTTPS" };
  }

  const { ready, config, vapidKey } = getFirebaseEnv();
  const permission = await Notification.requestPermission();
  // NOTE: This project includes the *structure* for Firebase push (env vars + SW file),
  // but does not bundle Firebase SDK by default to keep the website lean.
  // Once you add `firebase` package + backend integration, you can extend this helper
  // to fetch and send the FCM token.
  return {
    supported: true,
    permission,
    firebaseConfigured: Boolean(ready && vapidKey && config.apiKey && config.projectId),
  };
}
