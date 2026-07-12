import request from '@/api/shared/request';
import type {
  BlogPagination,
  BlogPost,
  PostsByTagResponse,
  TagItem,
} from '@/types';

export interface BlogQuery {
  page?: number;
  search?: string;
}

export interface BlogListResponse {
  posts: BlogPost[];
  tags: TagItem[];
  pagination: BlogPagination;
}

export interface BlogPostResponse {
  _id: string;
  title: string;
  body: string;
  summary?: string | null;
  cover?: string | null;
  tags: string[];
  is_pinned: boolean;
  views?: number;
  likes?: number;
  created_at: string;
  updated_at: string;
}

export interface BlogGateway {
  getBlogs(query?: BlogQuery): Promise<BlogListResponse>;
  getBlogPost(postId: string): Promise<BlogPostResponse>;
  getTags(): Promise<TagItem[]>;
  getPostsByTag(tag: string): Promise<PostsByTagResponse>;
  likePost(postId: string): Promise<number>;
  getLegacyPost(postId: string): Promise<BlogPostResponse>;
  createLegacyPost(payload: {
    title: string;
    body: string;
    tags: string[];
    summary?: string | null;
    cover?: string | null;
    is_pinned: number;
  }): Promise<{ _id: string }>;
  updateLegacyPost(payload: {
    _id: string;
    title: string;
    body: string;
    tags: string[];
    summary?: string | null;
    cover?: string | null;
    is_pinned: number;
  }): Promise<{ _id: string }>;
  deleteLegacyPost(postId: string): Promise<void>;
}

export const blogGateway: BlogGateway = {
  async getBlogs(query?: BlogQuery): Promise<BlogListResponse> {
    const res = await request.get<{ data: BlogListResponse }>('v3/blogs', {
      params: query,
    });
    return res.data.data;
  },

  async getBlogPost(postId: string): Promise<BlogPostResponse> {
    const res = await request.get<{ data: BlogPostResponse }>(
      `v3/blogs/${postId}`,
    );
    return res.data.data;
  },

  async getTags(): Promise<TagItem[]> {
    const res = await request.get<{ data: { tags: TagItem[] } }>('v3/tags');
    return res.data.data.tags;
  },

  async getPostsByTag(tag: string): Promise<PostsByTagResponse> {
    const res = await request.get<{ data: PostsByTagResponse }>(
      `v3/tags/${encodeURIComponent(tag)}/posts`,
    );
    return res.data.data;
  },

  async likePost(postId: string): Promise<number> {
    const res = await request.post<{ data: { likes: number } }>(
      `v3/blogs/${postId}/like`,
    );
    return res.data.data.likes;
  },

  async getLegacyPost(postId: string): Promise<BlogPostResponse> {
    const res = await request.get<{ data: BlogPostResponse }>('v3/post', {
      params: { _id: postId },
    });
    return res.data.data;
  },

  async createLegacyPost(payload): Promise<{ _id: string }> {
    const res = await request.post<{ data: { _id: string } }>(
      'v3/post/add',
      payload,
    );
    return res.data.data;
  },

  async updateLegacyPost(payload): Promise<{ _id: string }> {
    const res = await request.put<{ data: { _id: string } }>(
      'v3/post/update',
      payload,
    );
    return res.data.data;
  },

  async deleteLegacyPost(postId: string): Promise<void> {
    await request.delete(`v3/post/${postId}/delete`);
  },
};
