import { useState } from "react";
import React from "react";
import { steamApi } from "../store/steamapi";


export const ConnectSteamButton = ({ className = "" }) => {
  const [loading, setLoading] = useState(false);
  const API_BASE = import.meta.env.VITE_BACKEND_URL;

  return (
    <button
      onClick={steamApi.goToSteamLogin}
      className={className || "btn-coral w-full py-3"}
    >
      {loading ? "Redirecting to Steam..." : "Log in with Steam"}
    </button>
  );
}