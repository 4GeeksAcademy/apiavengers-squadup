// src/pages/SteamCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { steamApi } from "../store/steamapi";
import { ACTION_TYPES } from "../store/store";
import authService from "../store/authService";

export const SteamCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { dispatch } = useGlobalReducer();
  const [phase, setPhase] = useState("decoding"); // decoding ▸ connecting ▸ syncing ▸ done
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        console.log("🔄 Starting Steam callback process...");
        console.log("🔍 Current URL:", window.location.href);
        console.log("🔍 Search params:", Object.fromEntries(params.entries()));
        
        /* 1️⃣ Decode the payload ------------------------------------------------ */
        const raw = params.get("d");
        if (!raw) {
          console.error("❌ Missing payload parameter 'd'");
          throw new Error("Missing Steam authentication payload");
        }

        console.log("📦 Decoding Steam payload...");
        
        // url-safe → normal base64
        let s = raw.replace(/-/g, "+").replace(/_/g, "/");
        while (s.length % 4) s += "=";
        
        let payload;
        try {
          payload = JSON.parse(atob(s));
        } catch (decodeError) {
          console.error("❌ Failed to decode payload:", decodeError);
          throw new Error("Invalid Steam authentication payload");
        }
        
        const { steamid, profile } = payload;
        
        if (!steamid || !profile) {
          console.error("❌ Missing steamid or profile in payload");
          throw new Error("Incomplete Steam authentication data");
        }
        
        console.log("✅ Steam payload decoded successfully:", { steamid, profile: profile.personaname });
        setPhase("connecting");

        /* 2️⃣ Tell backend to connect this SteamID ----------------------------- */
        console.log("🔗 Connecting Steam account to backend...");
        
        // Debug authentication state
        console.log("🔍 Auth state check:");
        console.log("  - Access token exists:", !!authService.getAccessToken());
        console.log("  - Refresh token exists:", !!authService.getRefreshToken());
        console.log("  - User authenticated:", authService.isAuthenticated());
        console.log("  - Current user:", authService.getCurrentUser());
        
        // Ensure we have a valid token before making the request
        const accessToken = authService.getAccessToken();
        if (!accessToken) {
          console.error("❌ No access token available for Steam connection");
          throw new Error("Authentication required. Please log in again.");
        }
        
        console.log("🔍 Making Steam connect request to:", `${authService.getApiUrl()}/api/gaming/steam/connect`);
        
        const res = await steamApi.connectSteam(steamid);
        
        console.log("🔍 Steam connect response:", res.status, res.statusText);
        

      if (!res.ok) {
        console.error("❌ Backend connect failed:", res.status, res.body);

        if (res.status === 401) {
          console.log("🔄 Authentication expired, redirecting to login...");
          authService.clearTokens();
          navigate("/login", { replace: true });
          return;
        }

        throw new Error(res.body?.msg || `Steam connection failed (${res.status})`);
      }

        
        console.log("✅ Steam account connected successfully");

        /* 3️⃣ (First-time) library sync  -------------------------------------- */
        setPhase("syncing");
        console.log("📚 Syncing Steam library...");
        
        try {
          await steamApi.syncLibrary();
          console.log("✅ Steam library synced successfully");
        } catch (syncError) {
          console.warn("⚠️ Library sync failed (non-fatal):", syncError);
          // Continue anyway - this is non-fatal
        }

        /* 4️⃣ Update global store  --------------------------------------------- */
        console.log("🔄 Updating global store...");
        dispatch({ type: ACTION_TYPES.STEAM_LINKED, payload });        // Use proper action type
        dispatch({ type: ACTION_TYPES.SET_USER, payload: {            // keep user fresh
          is_steam_connected: true,
          steam_id: steamid,
          steam_avatar_url: profile.avatarfull,
          steam_username: profile.personaname,
        }});

        /* 5️⃣ All done → go back  --------------------------------------------- */
        setPhase("done");
        console.log("✅ Steam authentication complete! Redirecting to dashboard...");
        
        // Small delay to show success message
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 1000);
        
      } catch (err) {
        console.error("❌ Steam callback error:", err);
        setError(err.message || "Steam authentication failed");
        setPhase("error");
        
        // Redirect to profile page after error
        setTimeout(() => {
          navigate("/profile", { replace: true });
        }, 3000);
      }
    })();
  }, [params, dispatch, navigate]);

  /* ----------------------------------------------------------------------- */
  /*  Enhanced status message with better error handling                     */
  /* ----------------------------------------------------------------------- */
  const getMessage = () => {
    if (error) {
      return `Error: ${error}`;
    }
    
    const messages = {
      decoding: "Decoding Steam authentication data...",
      connecting: "Linking your Steam account...",
      syncing: "Syncing your game library...",
      done: "Steam linked successfully! Redirecting...",
      error: "Steam authentication failed. Redirecting to profile...",
    };
    
    return messages[phase] || "Processing...";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md mx-4">
        <div className="mb-6">
          {phase === "error" ? (
            <div className="w-12 h-12 bg-red-500/20 border-2 border-red-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-2xl">❌</span>
            </div>
          ) : phase === "done" ? (
            <div className="w-12 h-12 bg-green-500/20 border-2 border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-400 text-2xl">✅</span>
            </div>
          ) : (
            <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          )}
        </div>
        
        <h2 className="text-xl font-bold text-white mb-2">
          {phase === "error" ? "Authentication Failed" : "Steam Authentication"}
        </h2>
        
        <p className="text-white/70 text-sm">
          {getMessage()}
        </p>
        
        {phase === "error" && (
          <button 
            onClick={() => navigate("/profile")}
            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200"
          >
            Go to Profile
          </button>
        )}
      </div>
    </div>
  );
};
