import { useCallback } from 'react';

import { useFishingMapStore } from '@/stores/fishingMapStore';
import { useWeatherSelector } from '@/hooks/useFishingDataStore';

export function useWeatherData(location: [number, number]) {
  const { liveWeather, forecasts, locationName, loading, error } =
    useWeatherSelector();

  const refetch = useCallback(() => {
    void useFishingMapStore.getState().fetchWeatherAndFishing(location);
  }, [location]);

  return { liveWeather, forecasts, locationName, loading, error, refetch };
}
