import { useCallback } from 'react';

import { useFishingMapStore } from '@/stores/fishingMapStore';
import { useFishingIndexSelector } from '@/hooks/useFishingDataStore';

export function useFishingIndex(location: [number, number]) {
  const { indexData, loading, error } = useFishingIndexSelector();

  const refetch = useCallback(() => {
    void useFishingMapStore.getState().fetchWeatherAndFishing(location);
  }, [location]);

  return { indexData, loading, error, refetch };
}
