import type { AxiosResponse } from 'axios';

import request from '@/api/request';
import type { BlogPagination, BlogPost, Category, Comment } from '@/types';

interface BlogQuery {
  page?: number;
  search?: string;
}

interface BlogListResponse {
  posts: BlogPost[];
  categories: Category[];
  category_counts: Record<number, number>;
  pagination: BlogPagination;
}

interface BlogPostResponse {
  _id: string;
  title: string;
  body: string;
  category_id: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  category: { id: number; name: string } | null;
  comments: Comment[];
}

export interface blogGateway {
  getBlogs(query?: BlogQuery): Promise<AxiosResponse<BlogListResponse>>;
  getBlogPost(postId: string): Promise<AxiosResponse<BlogPostResponse>>;
  getCategories(): Promise<AxiosResponse<Category[]>>;
  getPostsByCategory(
    categoryId: number,
  ): Promise<
    AxiosResponse<{ posts: BlogPost[]; category: { id: number; name: string } }>
  >;
  // Legacy endpoints
  getLegacyPost(postId: string): Promise<AxiosResponse<BlogPostResponse>>;
  createLegacyPost(payload: {
    title: string;
    category_id: number;
    body: string;
    is_pinned: number;
  }): Promise<AxiosResponse<{ _id: string }>>;
  updateLegacyPost(payload: {
    _id: string;
    title: string;
    category_id: number;
    body: string;
    is_pinned: number;
  }): Promise<AxiosResponse<{ _id: string }>>;
  deleteLegacyPost(postId: string): Promise<AxiosResponse<void>>;
  getLegacyCategories(): Promise<AxiosResponse<Category[]>>;
}

export const blogGateway = (): blogGateway => {
  return {
    async getBlogs(query?: BlogQuery) {
      return request.get('v1/blogs', { params: query }) as Promise<
        AxiosResponse<BlogListResponse>
      >;
    },

    async getBlogPost(postId: string) {
      return request.get(`v1/blogs/${postId}`) as Promise<
        AxiosResponse<BlogPostResponse>
      >;
    },

    async getCategories() {
      return request.get('v1/blogs/categories') as Promise<
        AxiosResponse<Category[]>
      >;
    },

    async getPostsByCategory(categoryId: number) {
      return request.get(`v1/blogs/categories/${categoryId}`) as Promise<
        AxiosResponse<{
          posts: BlogPost[];
          category: { id: number; name: string };
        }>
      >;
    },

    async getLegacyPost(postId: string) {
      return request.get('v1/post', { params: { _id: postId } }) as Promise<
        AxiosResponse<BlogPostResponse>
      >;
    },

    async createLegacyPost(payload) {
      return request.post('v1/admin/post/add', payload) as Promise<
        AxiosResponse<{ _id: string }>
      >;
    },

    async updateLegacyPost(payload) {
      return request.put('v1/admin/post/update', payload) as Promise<
        AxiosResponse<{ _id: string }>
      >;
    },

    async deleteLegacyPost(postId: string) {
      return request.delete(`v1/admin/post/${postId}/delete`) as Promise<
        AxiosResponse<void>
      >;
    },

    async getLegacyCategories() {
      return request.get('v1/categories') as Promise<AxiosResponse<Category[]>>;
    },
  };
};
