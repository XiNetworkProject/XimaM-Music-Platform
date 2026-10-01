"use client";
import { useEffect, useRef, useState } from "react";
import type { CreatorAnalytics } from "@/lib/creatorAnalytics/model";

/** No cache shared between accounts; late responses cannot replace a new selection. */
export function useCreatorAnalytics(
  owner: string | null,
  query: string,
  refresh: number,
  demo?: CreatorAnalytics
) {
  const key = `${owner || "anonymous"}:${query}:${refresh}`;
  const [state, setState] = useState<{
    key: string;
    data: CreatorAnalytics | null;
    error: string | null;
  }>({ key: "", data: null, error: null });
  const sequence = useRef(0);
  useEffect(() => {
    const identity = ++sequence.current;
    if (demo || !owner) return;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 20000);
    setState({ key, data: null, error: null });
    fetch(`/api/stats/creator?${query}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Statistiques indisponibles");
        return body as CreatorAnalytics;
      })
      .then((data) => {
        if (identity === sequence.current && !controller.signal.aborted)
          setState({ key, data, error: null });
      })
      .catch((error) => {
        if (
          identity === sequence.current &&
          (!controller.signal.aborted || timedOut)
        )
          setState({
            key,
            data: null,
            error: timedOut
              ? "Le serveur met trop de temps à répondre."
              : error.message || "Connexion au serveur impossible.",
          });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      sequence.current++;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [key, owner, query, demo]);
  if (demo) return { data: demo, error: null, loading: false };
  const current = state.key === key;
  return {
    data: current && owner ? state.data : null,
    error: current && owner ? state.error : null,
    loading: Boolean(owner && (!current || (!state.data && !state.error))),
  };
}
