import { create } from 'zustand';

interface VisitorCountState {
  count: number;
  connectionDelay: number;
  setCount: (count: number) => void;
  setConnectionDelay: (ms: number) => void;
}

export const useVisitorCountStore = create<VisitorCountState>((set) => ({
  count: 0,
  connectionDelay: 0,
  setCount: (count) => set({ count }),
  setConnectionDelay: (ms) => set({ connectionDelay: ms }),
}));
