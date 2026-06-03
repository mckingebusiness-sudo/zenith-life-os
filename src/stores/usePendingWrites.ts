import { create } from 'zustand';

export type DataStatus = "confirmed" | "syncing" | "pending" | "stale" | "error";

interface PendingWritesState {
  pendingCount: number;
  lastUpdated: number | null;
  error: string | null;
  startWrite: () => void;
  endWrite: () => void;
  setError: (err: string) => void;
  clearError: () => void;
  getDataStatus: () => DataStatus;
}

export const usePendingWrites = create<PendingWritesState>((set, get) => ({
  pendingCount: 0,
  lastUpdated: Date.now(),
  error: null,
  startWrite: () => set((state) => ({ pendingCount: state.pendingCount + 1, error: null })),
  endWrite: () => set((state) => ({ 
    pendingCount: Math.max(0, state.pendingCount - 1), 
    lastUpdated: Date.now() 
  })),
  setError: (err) => set((state) => ({ 
    pendingCount: Math.max(0, state.pendingCount - 1), 
    error: err 
  })),
  clearError: () => set({ error: null }),
  getDataStatus: () => {
    const { pendingCount, error } = get();
    if (error) return "error";
    if (pendingCount > 0) return "syncing";
    return "confirmed";
  }
}));
