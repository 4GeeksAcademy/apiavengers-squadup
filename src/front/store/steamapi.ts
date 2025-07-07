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
    return authService.makeAuthenticatedRequest(
      `${API}/api/gaming/steam/connect`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steam_id: steamid }),
      }
    );
  },

  /** POST /gaming/steam/sync-library (1st sync, or manual re-sync) */
  async syncLibrary() {
    return authService.makeAuthenticatedRequest(
      `${API}/api/gaming/steam/sync-library`,
      { method: "POST" }
    );
  },

  /** GET /gaming/steam/library (convenience) */
  async getMyLibrary(params: string = "") {
    return authService.makeAuthenticatedRequest(
      `${API}/api/gaming/steam/library${params}`
    );
  },
};
