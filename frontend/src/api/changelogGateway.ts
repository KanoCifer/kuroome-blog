import request from './request';

interface Changelog {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const changelogGateway = {
  getChangelogs: async (): Promise<Changelog[]> => {
    const response = await request.get('v2/publicv2/changelogs');
    return response.data.data;
  },
};
