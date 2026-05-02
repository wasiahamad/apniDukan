import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/publicShopsApi";

// Frontend callback bridge that forwards the OAuth code to the backend exchange endpoint.
export default function GoogleOAuthLanding() {
  useEffect(() => {
    const search = window.location.search;
    if (!search) {
      window.location.replace("/");
      return;
    }

    window.location.replace(`${API_BASE_URL}/auth/oauth/google/callback${search}`);
  }, []);

  return null;
}
