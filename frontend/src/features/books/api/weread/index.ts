export { wereadGateway } from './wereadGateway';
export type { WereadGateway } from './wereadGateway';

// Weread 领域类型 —— 真源在 @/features/books/types，桶重新导出以保持兼容
export type {
  BookRecommendItem,
  ReadDetailBook,
  ReadDetailRawBase,
  ReadDetailRawLongestItem,
  ReadDetailRawRank,
  ReadDetailRawStat,
  ReadDetailRawAuthorItem,
  ReadDetailRawCategoryItem,
  ReadDetailRawPublisherItem,
  ReadDetailRawCopyrightInfo,
  ReadDetailSnapshot,
  ReadDetailWeeklyRaw,
  ReadDetailMonthlyRaw,
  ReadDetailAnnuallyRaw,
  ReadDetailOverallRaw,
  ReadStatsMode,
  WereadArchive,
  WereadBookDetail,
  WereadBookProgress,
  WereadReadProgressData,
  WereadShelfData,
  WereadUserInfo,
  WereadUserBook,
  WereadYearlyHeatmap,
} from '@/features/books/types';
export { READ_STATS_MODES } from '@/features/books/types';

export { galleryGateway } from '@/features/pic/api/galleryGateway';
export type { GalleryGateway } from '@/features/pic/api/galleryGateway';

// Gallery 领域类型 —— 真源在 @/features/pic/types，桶重新导出以保持兼容
export type { GalleryImage, GalleryResponse } from '@/features/pic/types';
