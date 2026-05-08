import { blogGateway } from "@/api/blogGateway";
import type { BlogPost, Category, BlogPagination, Comment } from "@/types";

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
  postComment(payload: {
    post_id: string;
    body: string;
    author: string;
    reply_to?: string;
    reply_to_author?: string;
  }): Promise<string>;
  getCategories(): Promise<CategoryItem[]>;
  getPostsByCategory(
    categoryId: number,
  ): Promise<{ posts: BlogPost[]; category: { id: number; name: string } }>;
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
  getPostsByLegacyCategory(
    categoryId: number,
  ): Promise<{ posts: BlogPost[]; category: { id: number; name: string } }>;
  postLegacyComment(payload: {
    post_id: string;
    body: string;
    author: string;
    reply_to?: string;
    reply_to_author?: string;
  }): Promise<void>;
}

// 递归计算评论数
const countComments = (comments: Comment[]): number => {
  return comments.reduce((count, c) => {
    return count + 1 + countComments(c.comments || []);
  }, 0);
};

export const blogService: BlogService = {
  async getBlogs(query) {
    const raw = await blogGateway.getBlogs(query);

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

  async getBlogPost(postId: string): Promise<BlogDetail> {
    return blogGateway.getBlogPost(postId);
  },

  async postComment(payload) {
    const res = await blogGateway.postComment(payload);
    return res._id;
  },

  async getCategories(): Promise<CategoryItem[]> {
    const categories = await blogGateway.getCategories();
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      post_count: c.post_count ?? c.posts_count ?? 0,
    }));
  },

  async getPostsByCategory(categoryId) {
    return blogGateway.getPostsByCategory(categoryId);
  },

  async getLegacyPost(postId) {
    return blogGateway.getLegacyPost(postId);
  },

  async createLegacyPost(payload) {
    return blogGateway.createLegacyPost(payload);
  },

  async updateLegacyPost(payload) {
    return blogGateway.updateLegacyPost(payload);
  },

  async deleteLegacyPost(postId) {
    await blogGateway.deleteLegacyPost(postId);
  },

  async getLegacyCategories() {
    const categories = await blogGateway.getLegacyCategories();
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      post_count: c.post_count ?? 0,
    }));
  },

  async getPostsByLegacyCategory(categoryId) {
    return blogGateway.getPostsByLegacyCategory(categoryId);
  },

  async postLegacyComment(payload) {
    await blogGateway.postLegacyComment(payload);
  },
};
