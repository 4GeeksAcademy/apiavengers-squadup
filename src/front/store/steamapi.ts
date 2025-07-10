// 100 % logic – no React
import authService from "../store/authService";

const API = authService.getApiUrl();

export const steamApi = {
  /** redirect user to the backend → Steam OpenID flow */
  goToSteamLogin() {
    window.location.href = `${API}/api/steam/login`;
  },

  /** POST /gaming/steam/connect after callback */
  /** POST /gaming/steam/connect after callback */
async connectSteam(steamid: string) {
  try {
    const url = `${API}/api/gaming/steam/connect`;
    const body = JSON.stringify({ steam_id: steamid });

    // Prefer access token from authService
    let accessToken = authService.getAccessToken();

    // If unavailable, try to get it from sessionStorage
    if (!accessToken) {
      accessToken = sessionStorage.getItem("access_token");
      console.warn("⚠️ No access token from authService, using fallback token from sessionStorage");
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else {
      console.warn("⚠️ Proceeding without Authorization header");
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    // Safely try to parse the JSON response
    const json = await res.json().catch(() => null);

    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      body: json,
    };
  } catch (error) {
    console.error("❌ Steam connect error:", error);
    throw error;
  }
} , 


  /** POST /gaming/steam/sync-library (1st sync, or manual re-sync) */
  async syncLibrary() {
    try {
      const accessToken = authService.getAccessToken();
      if (accessToken) {
        return authService.makeAuthenticatedRequest(
          `${API}/api/gaming/steam/sync-library`,
          { method: "POST" }
        );
      } else {
        console.warn("⚠️ No access token available for library sync");
        throw new Error("Authentication required for library sync");
      }
    } catch (error) {
      console.error("❌ Steam sync error:", error);
      throw error;
    }
  },

  /** GET /gaming/steam/library (convenience) */
  async getMyLibrary(params: string = "") {
    try {
      const accessToken = authService.getAccessToken();
      if (accessToken) {
        return authService.makeAuthenticatedRequest(
          `${API}/api/gaming/steam/library${params}`
        );
      } else {
        console.warn("⚠️ No access token available for library fetch");
        throw new Error("Authentication required for library access");
      }
    } catch (error) {
      console.error("❌ Steam library fetch error:", error);
      throw error;
    }
  },
};
