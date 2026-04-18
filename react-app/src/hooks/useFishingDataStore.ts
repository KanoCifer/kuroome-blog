import { useShallow } from 'zustand/react/shallow';

import { useFishingMapStore } from '@/stores/fishingMapStore';

export const useWeatherSelector = () =>
  useFishingMapStore(
    useShallow((s) => ({
      liveWeather: s.liveWeather,
      forecasts: s.forecasts,
      locationName: s.locationName,
      loading: s.weatherLoading,
      error: s.weatherError,
    })),
  );

export const useFishingIndexSelector = () =>
  useFishingMapStore(
    useShallow((s) => ({
      indexData: s.indexData,
      loading: s.indexLoading,
      error: s.indexError,
    })),
  );
