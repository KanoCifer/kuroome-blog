import apiClient from '@/shared/api/apiClient';

import type { Changelog } from '@/features/pages/types';

export const changelogGateway = {
  getChangelogs: async (): Promise<Changelog[]> => {
    const response = await apiClient.get('v2/publicv2/changelogs');
    return response.data.data;
  },
};
