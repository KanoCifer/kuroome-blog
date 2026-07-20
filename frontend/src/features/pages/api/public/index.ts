export { blogGateway } from '@/features/blog/api/blogGateway';
export type { BlogGateway } from '@/features/blog/api/blogGateway';

export { changelogGateway } from './changelogGateway';

// 博客 / Changelog 领域类型 —— 真源在各自 types，桶重新导出以保持兼容
export type {
  BlogListResponse,
  BlogPostResponse,
  BlogQuery,
} from '@/features/blog/types';
export type { Changelog, ChangelogItem } from '@/features/pages/types';
