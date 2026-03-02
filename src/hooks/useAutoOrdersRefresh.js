import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Poll orders (or any async refresh) while:
 *   1) screen is focused, AND
 *   2) app is in foreground (AppState === 'active')
 *
 * Prevents overlapping requests with a lock.
 */
export default function useAutoOrdersRefresh({
  enabled,
  intervalMs = 5000,
  onTick,
}) {
  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const inFlightRef = useRef(false);

  // Keep latest values without changing callbacks identity (prevents
  // useFocusEffect re-running on every render and causing rapid “immediate” ticks).
  const enabledRef = useRef(enabled);
  const intervalMsRef = useRef(intervalMs);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    intervalMsRef.current = intervalMs;
  }, [intervalMs]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const safeTick = useCallback(async () => {
    if (!enabledRef.current) return;
    if (appStateRef.current !== "active") return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    try {
      await onTickRef.current?.();
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const start = useCallback(() => {
    if (!enabledRef.current) return;
    if (appStateRef.current !== "active") return;
    if (intervalRef.current) return;

    // Run once immediately to reduce “up to 10s” staleness.
    safeTick();
    intervalRef.current = setInterval(safeTick, intervalMsRef.current);
  }, [safeTick]);

  useFocusEffect(
    useCallback(() => {
      // Focus: start polling if app is active.
      start();

      const sub = AppState.addEventListener("change", (nextState) => {
        appStateRef.current = nextState;
        if (nextState === "active") {
          start();
        } else {
          stop();
        }
      });

      return () => {
        // Blur/unmount: stop polling + remove listener.
        stop();
        sub?.remove?.();
      };
    }, [start, stop])
  );
}
