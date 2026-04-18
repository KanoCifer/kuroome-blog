import { useFishingMapStore } from '@/stores/fishingMapStore';

export const useWeatherSelector = () =>
  useFishingMapStore((s) => ({
    liveWeather: s.liveWeather,
    forecasts: s.forecasts,
    locationName: s.locationName,
    loading: s.weatherLoading,
    error: s.weatherError,
  }));

export const useTideSelector = () =>
  useFishingMapStore((s) => ({
    tideData: s.tideData,
    tideSpotName: s.tideSpotName,
    loading: s.tideLoading,
    error: s.tideError,
    tideHarbor: s.tideHarbor,
    tideDate: s.tideDate,
  }));

export const useFishingIndexSelector = () =>
  useFishingMapStore((s) => ({
    indexData: s.indexData,
    loading: s.indexLoading,
    error: s.indexError,
  }));
