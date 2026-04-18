import { create } from 'zustand';

import type { RouteInfo } from '@/views/FishingMap/types';

export interface RouteMapState {
  userPosition: [number, number] | null;
  routeInfo: RouteInfo | null;
  selectedSpotIndex: number | null;
  isPlanningRoute: boolean;
  setUserPosition: (pos: [number, number] | null) => void;
  setRouteInfo: (info: RouteInfo | null) => void;
  setSelectedSpotIndex: (idx: number | null) => void;
  setIsPlanningRoute: (loading: boolean) => void;
  clearRoute: () => void;
}

export const useRouteMapStore = create<RouteMapState>((set) => ({
  userPosition: null,
  routeInfo: null,
  selectedSpotIndex: null,
  isPlanningRoute: false,
  setUserPosition: (pos) => set({ userPosition: pos }),
  setRouteInfo: (info) => set({ routeInfo: info }),
  setSelectedSpotIndex: (idx) => set({ selectedSpotIndex: idx }),
  setIsPlanningRoute: (loading) => set({ isPlanningRoute: loading }),
  clearRoute: () => set({ routeInfo: null, selectedSpotIndex: null }),
}));
