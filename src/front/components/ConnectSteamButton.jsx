import { useState } from "react";
import React from "react";
import { steamApi } from "../store/steamapi";

export const ConnectSteamButton = ({ className = "", onError }) => {
  const [loading, setLoading] = useState(false);

  const handleSteamLogin = async () => {
    try {
      setLoading(true);
      console.log("🚀 Initiating Steam login...");
      
      // Call the Steam API to redirect to Steam login
      steamApi.goToSteamLogin();
      
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
      className={`${className || "btn-coral w-full py-3"} ${
        loading ? "opacity-50 cursor-not-allowed" : ""
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