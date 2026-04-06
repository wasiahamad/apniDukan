import { getApiBase } from "@/utils/apiBase";

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field?: string; message?: string }>;
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function normalizeApiErrorMessage(payload: any, fallback: string) {
  const msg = payload?.message || payload?.error || payload?.errors?.[0]?.message;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit & { accessToken?: string | null }
): Promise<T> {
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(options?.headers);
  if (!headers.has("Content-Type") && options?.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = options?.accessToken;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  let json: any = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    const msg = normalizeApiErrorMessage(json, `Request failed (${res.status})`);
    throw new ApiError(msg, res.status, json);
  }

  // Most backend endpoints return { success, message, data }
  if (json && typeof json === "object" && "data" in json) {
    return (json as ApiEnvelope<T>).data as T;
  }

  return json as T;
}

export function tryParsePhone10(raw: string | undefined | null) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  // Allow inputs like +91xxxxxxxxxx by taking last 10 digits
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}
