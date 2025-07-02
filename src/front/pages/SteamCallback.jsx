import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const SteamCallback=()=> {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { dispatch } = useGlobalReducer();

  useEffect(() => {
    try {
      // decode the base-64 payload
      let s = params.get("d").replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";
      const payload = JSON.parse(atob(s));

      dispatch({ type: "steamLinked", payload });   // save globally
    } catch (e) {
      console.error("Steam decode error", e);
    }

    navigate("/single");                            // go back to the page
  }, [params, dispatch, navigate]);

  return <p className="text-center m-5">Linking your Steam account…</p>;
}
