import request from '@/api/request';

export interface ChangelogItem {
  type: string;
  content: string;
}

export interface Changelog {
  version: string;
  date: string;
  title: string;
  changes: ChangelogItem[];
}

export const changelogGateway = {
  getChangelogs: async (): Promise<Changelog[]> => {
    const response = await request.get('v2/publicv2/changelogs');
    return (response.data as { data: Changelog[] }).data;
  },
};
