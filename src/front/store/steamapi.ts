// 100 % logic – no React
import authService from "../store/authService";

const API = authService.getApiUrl();

export const steamApi = {
  /** redirect user to the backend → Steam OpenID flow */
  goToSteamLogin() {
    window.location.href = `${API}/api/steam/login`;
  },

  /** POST /gaming/steam/connect after callback */
  async connectSteam(steamid: string) {
    try {
      // Try authenticated request first
      const accessToken = authService.getAccessToken();
      if (accessToken) {
        return authService.makeAuthenticatedRequest(
          `${API}/api/gaming/steam/connect`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ steam_id: steamid }),
          }
        );
      } else {
        // Fallback: make request without authentication
        console.warn("⚠️ No access token available, making unauthenticated request");
        return fetch(`${API}/api/gaming/steam/connect`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            // Try to get token from sessionStorage as fallback
            ...(sessionStorage.getItem('access_token') && {
              'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
            })
          },
          body: JSON.stringify({ steam_id: steamid }),
        });
      }
    } catch (error) {
      console.error("❌ Steam connect error:", error);
      throw error;
    }
  },

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
