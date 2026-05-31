import { blogGateway } from '@/api/blogGateway';
import { extractData } from '@/api/request';
import type { ApiResponse } from '@/api/request';
import type { BlogPost, Category, BlogPagination, Comment } from '@/types'; // Comment used by countComments

// 博客列表项（处理后的）
export interface BlogListItem {
  _id: string;
  title: string;
  body: string;
  category: { id: number; name: string } | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  comment_count: number;
}

// 博客列表（处理后的）
export interface BlogList {
  posts: BlogListItem[];
  categories: Category[];
  categoryCounts: Record<number, number>;
  pagination: BlogPagination;
}

// 博客详情（处理后的）
export interface BlogDetail {
  _id: string;
  title: string;
  body: string;
  category: { id: number; name: string } | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  comments: Comment[];
}

// 分类列表项
export interface CategoryItem {
  id: number;
  name: string;
  post_count: number;
}

export interface BlogService {
  getBlogs(query?: { page?: number; search?: string }): Promise<BlogList>;
  getBlogPost(postId: string): Promise<BlogDetail>;
  getCategories(): Promise<CategoryItem[]>;
  getPostsByCategory(
    categoryId: number,
  ): Promise<{ posts: BlogPost[]; category: { id: number; name: string } }>;
  // Legacy endpoints
  getLegacyPost(postId: string): Promise<BlogDetail & { category_id?: number }>;
  createLegacyPost(payload: {
    title: string;
    category_id: number;
    body: string;
    is_pinned: number;
  }): Promise<{ _id: string }>;
  updateLegacyPost(payload: {
    _id: string;
    title: string;
    category_id: number;
    body: string;
    is_pinned: number;
  }): Promise<{ _id: string }>;
  deleteLegacyPost(postId: string): Promise<void>;
  getLegacyCategories(): Promise<CategoryItem[]>;
}

export const blogService = (): BlogService => {
  const gateway = blogGateway();

  // 递归计算评论数
  const countComments = (comments: Comment[]): number => {
    return comments.reduce((count, c) => {
      return count + 1 + countComments(c.comments || []);
    }, 0);
  };

  return {
    async getBlogs(query) {
      const res = await gateway.getBlogs(query);
      const raw = extractData(
        res as unknown as { data: ApiResponse<unknown> },
      ) as {
        posts: BlogPost[];
        categories: Category[];
        category_counts: Record<number, number>;
        pagination: BlogPagination;
      };

      const posts: BlogListItem[] = raw.posts.map((post) => ({
        _id: post._id,
        title: post.title,
        body: post.body,
        category: post.category,
        is_pinned:
          (post as BlogPost & { is_pinned?: boolean }).is_pinned || false,
        created_at: post.created_at,
        updated_at: post.updated_at,
        comment_count: countComments(
          (post as BlogPost & { comments?: Comment[] }).comments || [],
        ),
      }));

      return {
        posts,
        categories: raw.categories,
        categoryCounts: raw.category_counts,
        pagination: raw.pagination,
      };
    },

    async getBlogPost(postId: string) {
      const res = await gateway.getBlogPost(postId);
      return extractData(
        res as unknown as { data: ApiResponse<unknown> },
      ) as BlogDetail;
    },

    async getCategories() {
      const res = await gateway.getCategories();
      return (
        extractData(
          res as unknown as { data: ApiResponse<unknown> },
        ) as Category[]
      ).map((c) => ({
        id: c.id,
        name: c.name,
        post_count: c.post_count ?? c.posts_count ?? 0,
      }));
    },

    async getPostsByCategory(categoryId) {
      const res = await gateway.getPostsByCategory(categoryId);
      return extractData(res as unknown as { data: ApiResponse<unknown> }) as {
        posts: BlogPost[];
        category: { id: number; name: string };
      };
    },

    async getLegacyPost(postId) {
      const res = await gateway.getLegacyPost(postId);
      return extractData(
        res as unknown as { data: ApiResponse<unknown> },
      ) as BlogDetail & { category_id?: number };
    },

    async createLegacyPost(payload) {
      const res = await gateway.createLegacyPost(payload);
      return extractData(res as unknown as { data: ApiResponse<unknown> }) as {
        _id: string;
      };
    },

    async updateLegacyPost(payload) {
      const res = await gateway.updateLegacyPost(payload);
      return extractData(res as unknown as { data: ApiResponse<unknown> }) as {
        _id: string;
      };
    },

    async deleteLegacyPost(postId) {
      await gateway.deleteLegacyPost(postId);
    },

    async getLegacyCategories() {
      const res = await gateway.getLegacyCategories();
      return (
        extractData(
          res as unknown as { data: ApiResponse<unknown> },
        ) as Category[]
      ).map((c) => ({
        id: c.id,
        name: c.name,
        post_count: c.post_count ?? c.posts_count ?? 0,
      }));
    },
  };
};
