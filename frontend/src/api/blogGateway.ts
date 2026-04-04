import request from "@/api/request";
import type { BlogPost, BlogPagination, Category, Comment } from "@/types";

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
  category_id: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  category: { id: number; name: string } | null;
  comments: Comment[];
}

export interface PostCommentPayload {
  post_id: string;
  body: string;
  author: string;
  reply_to?: string;
  reply_to_author?: string;
}

export interface BlogGateway {
  getBlogs(query?: BlogQuery): Promise<BlogListResponse>;
  getBlogPost(postId: string): Promise<BlogPostResponse>;
  postComment(payload: PostCommentPayload): Promise<{ _id: string }>;
  getCategories(): Promise<Category[]>;
  getPostsByCategory(categoryId: number): Promise<{ posts: BlogPost[]; category: { id: number; name: string } }>;
  getLegacyPost(postId: string): Promise<BlogPostResponse>;
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
  getLegacyCategories(): Promise<Category[]>;
  getPostsByLegacyCategory(categoryId: number): Promise<{ posts: BlogPost[]; category: { id: number; name: string } }>;
  postLegacyComment(payload: PostCommentPayload): Promise<void>;
}

export const blogGateway: BlogGateway = {
  async getBlogs(query?: BlogQuery): Promise<BlogListResponse> {
    const res = await request.get<{ data: BlogListResponse }>("/blogs", {
      params: query,
    });
    return res.data.data;
  },

  async getBlogPost(postId: string): Promise<BlogPostResponse> {
    const res = await request.get<{ data: BlogPostResponse }>(`/blogs/${postId}`);
    return res.data.data;
  },

  async postComment(payload: PostCommentPayload): Promise<{ _id: string }> {
    const res = await request.post<{ data: { _id: string } }>("/blogs/comments", payload);
    return res.data.data;
  },

  async getCategories(): Promise<Category[]> {
    const res = await request.get<{ data: Category[] }>("/blogs/categories");
    return res.data.data;
  },

  async getPostsByCategory(categoryId: number): Promise<{ posts: BlogPost[]; category: { id: number; name: string } }> {
    const res = await request.get<{
      data: { posts: BlogPost[]; category: { id: number; name: string } };
    }>(`/blogs/categories/${categoryId}`);
    return res.data.data;
  },

  async getLegacyPost(postId: string): Promise<BlogPostResponse> {
    const res = await request.get<{ data: BlogPostResponse }>("/post", {
      params: { _id: postId },
    });
    return res.data.data;
  },

  async createLegacyPost(payload): Promise<{ _id: string }> {
    const res = await request.post<{ data: { _id: string } }>("/admin/post/add", payload);
    return res.data.data;
  },

  async updateLegacyPost(payload): Promise<{ _id: string }> {
    const res = await request.put<{ data: { _id: string } }>("/admin/post/update", payload);
    return res.data.data;
  },

  async deleteLegacyPost(postId: string): Promise<void> {
    await request.delete(`/admin/post/${postId}/delete`);
  },

  async getLegacyCategories(): Promise<Category[]> {
    const res = await request.get<{ data: Category[] }>("/categories");
    return res.data.data;
  },

  async getPostsByLegacyCategory(categoryId: number): Promise<{ posts: BlogPost[]; category: { id: number; name: string } }> {
    const res = await request.post<{ data: { posts: BlogPost[]; category: { id: number; name: string } } }>("/category", null, {
      params: { category_id: categoryId },
    });
    return res.data.data;
  },

  async postLegacyComment(payload: PostCommentPayload): Promise<void> {
    await request.post("/comments", payload);
  },
};
