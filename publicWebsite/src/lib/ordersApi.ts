import { API_BASE_URL } from "@/lib/publicShopsApi";

export type PublicOrderSource = "website" | "whatsapp" | "manual";
export type PublicOrderOrigin = "website" | "map" | "unknown";

export type CreatePublicOrderInput = {
  businessId: string;
  source: PublicOrderSource;
  origin?: PublicOrderOrigin;
  items: Array<{ listingId: string; quantity: number; pricingOptionLabel?: string }>;
  customer?: { name?: string; phone?: string };
};

const getToken = () => {
  try {
    return localStorage.getItem("accessToken");
  } catch {
    return null;
  }
};

const base = String(API_BASE_URL).replace(/\/+$/, "");

export const createPublicOrder = async (input: CreatePublicOrderInput) => {
  const token = getToken();
  const res = await fetch(`${base}/orders/public`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // Note: keepalive allows the request to complete during tab close/navigation.
    // (On some browsers it may be ignored, but it's safe.)
    keepalive: true,
    body: JSON.stringify(input),
  });

  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || json?.success === false) {
    const msg = String(json?.message || "Failed to create order");
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return json as { success: boolean; data?: any; message?: string };
};
