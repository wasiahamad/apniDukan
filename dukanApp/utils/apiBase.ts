import { Platform } from "react-native";

const ensureApiSuffix = (base: string) => {
  const clean = String(base || "").trim().replace(/\/+$/, "");
  if (!clean) return "";
  return clean.endsWith("/api") ? clean : `${clean}/api`;
};

export const getApiBase = () => {
  const direct = ensureApiSuffix(process.env.EXPO_PUBLIC_API_BASE || "");
  if (direct) return direct;

  const domain = String(process.env.EXPO_PUBLIC_DOMAIN || "").trim();
  if (domain) return `https://${domain}/api`;

  // Local dev fallbacks
  if (Platform.OS === "android") return "http://10.0.2.2:5000/api";
  return "https://apnidukan-vlnw.onrender.com/api";
};
