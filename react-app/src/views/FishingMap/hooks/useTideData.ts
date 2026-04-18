import { useCallback } from 'react';

import { HARBOR_OPTIONS } from '@/stores/fishingMapStore';
import { useFishingMapStore } from '@/stores/fishingMapStore';
import { useTideSelector } from '@/hooks/useFishingDataStore';

export function useTideData() {
  const { tideData, tideSpotName, loading, tideHarbor, tideDate } =
    useTideSelector();

  const setSelectedHarbor = useCallback((harbor: string) => {
    useFishingMapStore.getState().setTideHarbor(harbor);
  }, []);

  const setSelectedDate = useCallback((date: string) => {
    useFishingMapStore.getState().setTideDate(date);
  }, []);

  const refetch = useCallback(() => {
    void useFishingMapStore.getState().fetchTide();
  }, []);

  return {
    tideData,
    tideSpotName,
    loading,
    selectedHarbor: tideHarbor,
    selectedDate: tideDate,
    harborOptions: HARBOR_OPTIONS,
    setSelectedHarbor,
    setSelectedDate,
    refetch,
  };
}
