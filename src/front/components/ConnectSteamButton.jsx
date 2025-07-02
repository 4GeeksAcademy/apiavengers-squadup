import { useState } from "react";

export const ConnectSteamButton = () => {
  const [loading, setLoading] = useState(false);
  const API_BASE = "https://animated-eureka-5grpx4q7wvpgf66g-3001.app.github.dev";

  const handleSteamLogin = () => {
    window.location.href = `${API_BASE}/api/steam/login`;
  };

  return (
    <button onClick={handleSteamLogin} className="btn btn-success" disabled={loading}>
      {loading ? "Redirecting to Steam..." : "Log in with Steam"}
    </button>
  );
}