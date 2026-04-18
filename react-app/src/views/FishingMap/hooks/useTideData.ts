import { useCallback, useEffect, useState } from 'react';

import dayjs from 'dayjs';

import { HARBOR_OPTIONS } from '@/stores/fishingMapStore';
import { fishingMapGateway } from '../gateway';
import type { TideData } from '../types';

export interface UseTideDataReturn {
  tideData: TideData | null;
  tideSpotName: string;
  loading: boolean;
  selectedHarbor: string;
  selectedDate: string;
  harborOptions: readonly { code: string; name: string }[];
  setSelectedHarbor: (harbor: string) => void;
  setSelectedDate: (date: string) => void;
  refetch: () => void;
}

export function useTideData(): UseTideDataReturn {
  const [tideData, setTideData] = useState<TideData | null>(null);
  const [tideSpotName, setTideSpotName] = useState('黄埔港');
  const [loading, setLoading] = useState(false);
  const [selectedHarbor, setSelectedHarbor] = useState('P2352');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYYMMDD'));

  const fetchTide = useCallback(async (harbor: string, date: string) => {
    setLoading(true);
    try {
      const gateway = fishingMapGateway();
      const res = await gateway.getTide({ harbor, date });
      const data = res.data.data as TideData;
      const harborOption = HARBOR_OPTIONS.find((o) => o.code === harbor);
      setTideData(data);
      setTideSpotName(harborOption?.name ?? '黄埔港');
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTide(selectedHarbor, selectedDate);
  }, [fetchTide, selectedHarbor, selectedDate]);

  const setSelectedHarborWithFetch = useCallback(
    (harbor: string) => {
      setSelectedHarbor(harbor);
      void fetchTide(harbor, selectedDate);
    },
    [fetchTide, selectedDate],
  );

  const setSelectedDateWithFetch = useCallback(
    (date: string) => {
      setSelectedDate(date);
      void fetchTide(selectedHarbor, date);
    },
    [fetchTide, selectedHarbor],
  );

  const refetch = useCallback(() => {
    void fetchTide(selectedHarbor, selectedDate);
  }, [fetchTide, selectedHarbor, selectedDate]);

  return {
    tideData,
    tideSpotName,
    loading,
    selectedHarbor,
    selectedDate,
    harborOptions: HARBOR_OPTIONS,
    setSelectedHarbor: setSelectedHarborWithFetch,
    setSelectedDate: setSelectedDateWithFetch,
    refetch,
  };
}
