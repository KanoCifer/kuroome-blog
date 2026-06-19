import request from '@/api/shared/request';
import type { BlogPagination, BlogPost, Category } from '@/types';

export interface BlogQuery {
  page?: number;
  search?: string;
}

export interface BlogListResponse {
  posts: BlogPost[];
  categories: Category[];
  category_counts: Record<number, number>;
  pagination: BlogPagination;
}

export interface BlogPostResponse {
  _id: string;
  title: string;
  body: string;
  summary?: string | null;
  cover?: string | null;
  category_id: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  category: { id: number; name: string } | null;
}

export interface BlogGateway {
  getBlogs(query?: BlogQuery): Promise<BlogListResponse>;
  getBlogPost(postId: string): Promise<BlogPostResponse>;
  getCategories(): Promise<Category[]>;
  getPostsByCategory(
    categoryId: number,
  ): Promise<{ posts: BlogPost[]; category: { id: number; name: string } }>;
  getLegacyPost(postId: string): Promise<BlogPostResponse>;
  createLegacyPost(payload: {
    title: string;
    category_id: number;
    body: string;
    summary?: string | null;
    cover?: string | null;
    is_pinned: number;
  }): Promise<{ _id: string }>;
  updateLegacyPost(payload: {
    _id: string;
    title: string;
    category_id: number;
    body: string;
    summary?: string | null;
    cover?: string | null;
    is_pinned: number;
  }): Promise<{ _id: string }>;
  deleteLegacyPost(postId: string): Promise<void>;
  getLegacyCategories(): Promise<Category[]>;
  getPostsByLegacyCategory(
    categoryId: number,
  ): Promise<{ posts: BlogPost[]; category: { id: number; name: string } }>;
}

export const blogGateway: BlogGateway = {
  async getBlogs(query?: BlogQuery): Promise<BlogListResponse> {
    const res = await request.get<{ data: BlogListResponse }>('v1/blogs', {
      params: query,
    });
    return res.data.data;
  },

  async getBlogPost(postId: string): Promise<BlogPostResponse> {
    const res = await request.get<{ data: BlogPostResponse }>(
      `v1/blogs/${postId}`,
    );
    return res.data.data;
  },

  async getCategories(): Promise<Category[]> {
    const res = await request.get<{ data: Category[] }>('v1/blogs/categories');
    return res.data.data;
  },

  async getPostsByCategory(
    categoryId: number,
  ): Promise<{ posts: BlogPost[]; category: { id: number; name: string } }> {
    const res = await request.get<{
      data: { posts: BlogPost[]; category: { id: number; name: string } };
    }>(`v1/blogs/categories/${categoryId}`);
    return res.data.data;
  },

  async getLegacyPost(postId: string): Promise<BlogPostResponse> {
    const res = await request.get<{ data: BlogPostResponse }>('v1/post', {
      params: { _id: postId },
    });
    return res.data.data;
  },

  async createLegacyPost(payload): Promise<{ _id: string }> {
    const res = await request.post<{ data: { _id: string } }>(
      'v1/admin/post/add',
      payload,
    );
    return res.data.data;
  },

  async updateLegacyPost(payload): Promise<{ _id: string }> {
    const res = await request.put<{ data: { _id: string } }>(
      'v1/admin/post/update',
      payload,
    );
    return res.data.data;
  },

  async deleteLegacyPost(postId: string): Promise<void> {
    await request.delete(`v1/admin/post/${postId}/delete`);
  },

  async getLegacyCategories(): Promise<Category[]> {
    const res = await request.get<{ data: Category[] }>('v1/categories');
    return res.data.data;
  },

  async getPostsByLegacyCategory(
    categoryId: number,
  ): Promise<{ posts: BlogPost[]; category: { id: number; name: string } }> {
    const res = await request.post<{
      data: { posts: BlogPost[]; category: { id: number; name: string } };
    }>('v1/category', null, {
      params: { category_id: categoryId },
    });
    return res.data.data;
  },
};
