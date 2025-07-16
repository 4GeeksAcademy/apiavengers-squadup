// src/pages/Single.jsx
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import useGlobalReducer from "../hooks/useGlobalReducer";
import {ConnectSteamButton} from "../components/ConnectSteamButton";   

export const Single = () => {
  /* ── context + router ─────────────────────────────────────────────────── */
  const { store, dispatch } = useGlobalReducer();
  const { theId }           = useParams();
  const navigate            = useNavigate();
  const location            = useLocation();

  /* ── local fallback for steam data ────────────────────────────────────── */
  const [steamData, setSteamData] = useState(null);

  /* ── auth-gate + openid catch-up ──────────────────────────────────────── */
  useEffect(() => {
    /* JWT gate */
    const token = localStorage.getItem("access_token");
    if (!token) return navigate("/login");

    try {
      const { exp } = jwtDecode(token);
      // Only log out if exp exists **and** is in the past
      if (exp && exp < Date.now() / 1000) {
        localStorage.removeItem("access_token");
        return navigate("/login");
      }
    } catch {
      localStorage.removeItem("access_token");
      return navigate("/login");
    }

    /* Use global steam data if we already have it */
    if (store.steamLinked) {
      setSteamData(store.steamLinked);
      return;
    }

    /* One-step flow: we landed on /single?openid.* so fetch it directly */
    if (location.search.includes("openid.")) {
      fetch(`/api/steam/authorize${location.search}`)
        .then(r => r.json())
        .then(data => {
          dispatch({ type: "steamLinked", payload: data });
          setSteamData(data);
          // wipe query-string to keep URL clean
          window.history.replaceState({}, "", location.pathname);
        })
        .catch(console.error);
    }
  }, [dispatch, navigate, location.search, store.steamLinked]);

  /* ── other data you might still need ─────────────────────────────────── */
  const singleTodo = store.todos?.find(t => t.id === Number(theId));

  /* ── final games array for render ─────────────────────────────────────── */
  const games = steamData?.games?.games || [];

  /* ── JSX ──────────────────────────────────────────────────────────────── */
  return (
    <div className="container text-center">
      <h1 className="display-4">
        Todo: You are now logged in to a protected link.
      </h1>

      <hr className="my-4" />

      {/* Steam-connect button only if we have no games yet */}
      {!games.length && <ConnectSteamButton />}

      {/* Back-home link */}
      <Link to="/" className="btn btn-primary btn-lg ms-3">
        Back home
      </Link>

      {/* Games grid or friendly message */}
      {games.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-5">
          {games.map(game => (
            <div key={game.appid} className="bg-white p-4 shadow rounded-lg">
              <img
                src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                alt={game.name}
                className="w-full h-auto mb-2 rounded"
              />
              <h2 className="text-lg font-semibold">{game.name}</h2>
              <p className="text-sm text-gray-600">
                {(game.playtime_forever / 60).toFixed(1)} hrs played
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5">
          {store.steamLinked
            ? "No games found on this Steam account."
            : "Link your Steam account to see your games."}
        </p>
      )}
    </div>
  );
};
