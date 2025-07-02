// src/pages/SteamCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { steamApi } from "../store/steamapi";

export const SteamCallback = () => {
  const [params]     = useSearchParams();
  const navigate      = useNavigate();
  const { dispatch }  = useGlobalReducer();
  const [phase, setPhase] = useState("decoding"); // decoding ▸ connecting ▸ syncing ▸ done

  useEffect(() => {
    (async () => {
      try {
        /* 1️⃣ Decode the payload ------------------------------------------------ */
        const raw = params.get("d");
        if (!raw) throw new Error("Missing payload");

        // url-safe → normal base64
        let s = raw.replace(/-/g, "+").replace(/_/g, "/");
        while (s.length % 4) s += "=";
        const payload  = JSON.parse(atob(s));
        const { steamid, profile } = payload;
        setPhase("connecting");

        /* 2️⃣ Tell backend to connect this SteamID ----------------------------- */
        const res = await steamApi.connectSteam(steamid);
        if (!res.ok) throw new Error("Backend connect failed");

        /* 3️⃣ (First-time) library sync  -------------------------------------- */
        setPhase("syncing");
        await steamApi.syncLibrary().catch(() => {}); // non-fatal

        /* 4️⃣ Update global store  --------------------------------------------- */
        dispatch({ type: "steamLinked", payload });        // your existing reducer
        dispatch({ type: "SET_USER", payload: {            // keep user fresh
          is_steam_connected: true,
          steam_id:     steamid,
          steam_avatar_url: profile.avatarfull,
          steam_username:   profile.personaname,
        }});

        /* 5️⃣ All done → go back  --------------------------------------------- */
        setPhase("done");
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Steam callback error", err);
        setPhase("error");
      }
    })();
  }, [params, dispatch, navigate]);

  /* ----------------------------------------------------------------------- */
  /*  Simple status message – style / replace as you wish                    */
  /* ----------------------------------------------------------------------- */
  const msg = {
    decoding:   "Decoding Steam payload…",
    connecting: "Linking Steam account…",
    syncing:    "Syncing game library…",
    done:       "Steam linked! Redirecting…",
    error:      "Steam link failed – please try again.",
  }[phase];

  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <p>{msg}</p>
    </div>
  );
};
