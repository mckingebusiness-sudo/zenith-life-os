import { useEffect } from "react";
import { useIsMutating } from "@tanstack/react-query";

/**
 * Tracks all in-flight TanStack Query mutations globally.
 * Shows beforeunload warning when mutations are pending.
 *
 * Usage:
 *   const { hasPending, pendingCount } = usePendingWrites();
 */
export function usePendingWrites() {
  const pendingCount = useIsMutating();

  // beforeunload protection — warn user when mutations are in-flight
  useEffect(() => {
    if (pendingCount === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingCount]);

  return {
    hasPending: pendingCount > 0,
    pendingCount,
  };
}
