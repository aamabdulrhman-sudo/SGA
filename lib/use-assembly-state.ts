"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type AssemblyState = any; // structured via API /api/state

export function useAssemblyState(assemblyId: string | null, intervalMs = 4000) {
  const [state, setState] = useState<AssemblyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchState = useCallback(async () => {
    if (!assemblyId) return;
    try {
      const res = await fetch(`/api/state?assemblyId=${assemblyId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setState(data);
      setError(null);
    } catch {
      setError("تعذر الاتصال بالخادم — إعادة المحاولة...");
    }
  }, [assemblyId]);

  useEffect(() => {
    fetchState();
    timerRef.current = setInterval(fetchState, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchState, intervalMs]);

  return { state, error, refresh: fetchState };
}
