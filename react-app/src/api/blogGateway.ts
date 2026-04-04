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

interface PostCommentPayload {
  post_id: string;
  body: string;
  author: string;
  reply_to?: string;
  reply_to_author?: string;
}

export interface blogGateway {
  getBlogs(query?: BlogQuery): Promise<AxiosResponse<BlogListResponse>>;
  getBlogPost(postId: string): Promise<AxiosResponse<BlogPostResponse>>;
  postComment(
    payload: PostCommentPayload,
  ): Promise<AxiosResponse<{ _id: string }>>;
  getCategories(): Promise<AxiosResponse<Category[]>>;
  getPostsByCategory(
    categoryId: number,
  ): Promise<AxiosResponse<{ posts: BlogPost[]; category: { id: number; name: string } }>>;
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
  getLegacyCategories(): Promise<AxiosResponse<Category[]>>;
}

export const blogGateway = (): blogGateway => {
  return {
    async getBlogs(query?: BlogQuery) {
      return request.get('/blogs', { params: query }) as Promise<
        AxiosResponse<BlogListResponse>
      >;
    },

    async getBlogPost(postId: string) {
      return request.get(`/blogs/${postId}`) as Promise<
        AxiosResponse<BlogPostResponse>
      >;
    },

    async postComment(payload: PostCommentPayload) {
      return request.post(
        '/blogs/comments',
        payload,
      ) as Promise<AxiosResponse<{ _id: string }>>;
    },

    async getCategories() {
      return request.get('/blogs/categories') as Promise<
        AxiosResponse<Category[]>
      >;
    },

    async getPostsByCategory(categoryId: number) {
      return request.get(
        `/blogs/categories/${categoryId}`,
      ) as Promise<
        AxiosResponse<{
          posts: BlogPost[];
          category: { id: number; name: string };
        }>
      >;
    },

    async getLegacyPost(postId: string) {
      return request.get('/post', { params: { _id: postId } }) as Promise<
        AxiosResponse<BlogPostResponse>
      >;
    },

    async createLegacyPost(payload) {
      return request.post('/admin/post/add', payload) as Promise<
        AxiosResponse<{ _id: string }>
      >;
    },

    async updateLegacyPost(payload) {
      return request.put('/admin/post/update', payload) as Promise<
        AxiosResponse<{ _id: string }>
      >;
    },

    async getLegacyCategories() {
      return request.get('/categories') as Promise<
        AxiosResponse<Category[]>
      >;
    },
  };
};
