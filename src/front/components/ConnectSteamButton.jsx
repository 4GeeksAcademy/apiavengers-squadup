import { useState } from "react";
import React from "react";
import authService from "../store/authService";

export const ConnectSteamButton = ({ className = "", onError }) => {
  const [loading, setLoading] = useState(false);

  const handleSteamLogin = async () => {
    try {
      setLoading(true);
      console.log("🚀 Initiating Steam login...");

      const backendUrl = authService.getApiUrl();
      const response = await authService.makeAuthenticatedRequest(
        `${backendUrl}/api/auth/steam/login`
      );

      if (response.ok) {
        const { steam_auth_url } = await response.json();
        window.location.href = steam_auth_url;
      } else {
        console.error("❌ Steam login failed:", response.status);
        setLoading(false);
        if (onError) {
          onError("Failed to initiate Steam connection");
        }
      }

    } catch (error) {
      console.error("❌ Steam login error:", error);
      setLoading(false);

      if (onError) {
        onError("Failed to connect to Steam. Please try again.");
      }
    }
  };

  return (
    <button
      onClick={handleSteamLogin}
      disabled={loading}
      className={`${className || "btn-coral w-full py-3"} ${loading ? "opacity-50 cursor-not-allowed" : ""
        }`}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
          Connecting to Steam...
        </span>
      ) : (
        "Connect Steam Account"
      )}
    </button>
  );
};