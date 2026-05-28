// 博客文章类型（PostgreSQL 存储，使用 id 主键）
export interface Post {
  id?: number;
  _id?: string;
  title: string;
  content?: string;
  body: string; // 确保 body 是必填字段
  summary?: string;
  category_id?: number;
  cover?: string;
  author_id?: number;
  author_name?: string;
  author?: string;
  views?: number;
  created_at: string; // 确保 created_at 是必填字段
  updated_at?: string;
  category?: Category;
  is_pinned?: boolean;
  comments?: Comment[];
}

// 博客文章类型（MongoDB 存储，使用 _id 主键）
export interface BlogPost {
  _id: string;
  title: string;
  body: string;
  summary?: string | null;
  created_at: string;
  updated_at: string;
  category_id: number;
  category: { id: number; name: string } | null;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  post_count: number;
  posts_count?: number;
  created_at: string;
  updated_at: string;
}

export interface BlogPagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_prev: boolean;
  has_next: boolean;
  prev_num?: number | null;
  next_num?: number | null;
}

export interface BlogsResponse {
  status: string;
  message: string;
  data: {
    posts: Post[];
    categories: Category[];
    pagination: BlogPagination;
  };
}

export interface ApiResponse<T = unknown> {
  status: string;
  message: string;
  data?: T;
}

// 评论类型定义（通用）
export interface Comment {
  id?: number;
  _id: string; // 确保 _id 是必填字段，解决类型错误
  post_id?: number | string;
  user_id?: number;
  name?: string;
  content?: string;
  created_at: string; // 确保 created_at 是必填字段
  updated_at?: string;
  replied_id?: string | null;
  from_admin?: boolean;
  reviewed?: boolean;
  author: string; // 确保 author 是必填字段，解决类型错误
  email?: string;
  body: string; // 确保 body 是必填字段
  site?: string;
  comments?: Comment[];
  reply_to_author?: string;
  post_title?: string;
}

export interface PostResponse {
  status: string;
  message: string;
  data: Post;
}

// 书籍类型定义
export interface BookItem {
  id: number;
  title: string;
  author: string;
  bookid?: string | null;
  cover: string | null;
  iscompleted: boolean;
  add_date?: string | null;
  update_date?: string | null;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_prev: boolean;
  has_next: boolean;
  prev_num: number | null;
  next_num: number | null;
}

export interface BookListData {
  books: BookItem[];
  pagination: Pagination;
}

export interface BookListResponse {
  status: string;
  message: string;
  data?: BookListData;
}

export interface LoginForm {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface ProfileForm {
  name?: string;
  username?: string;
  gender?: string;
  email?: string;
  mobile?: string;
  password?: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirm_password?: string;
  confirmPassword?: string;
  emailCode?: string;
}

export interface ADDBookForm {
  title: string;
  author: string;
  iscompleted: boolean;
}

// 留言板类型定义（管理界面用）
export interface Message {
  id: string;
  name: string;
  message: string;
  created_at: string;
  review: number;
  from_admin?: boolean;
}

// 目录项类型定义
export interface TocItem {
  id: string;
  text: string;
  level: number;
}

// 徽章类型定义
export interface Badge {
  text: string;
  type: 'default' | 'success' | 'error' | 'warning' | 'info';
}

// 分类响应项类型
export interface CategoryResponseItem {
  id: number;
  name: string;
  description: string;
  posts: Post[];
  post_count?: number;
}

// RSS 文章类型
export interface RssArticle {
  id: string;
  guid: string;
  feed_url: string;
  title: string;
  link: string;
  summary: string;
  content: string;
  author: string | null;
  published: string | null;
  fetched_at: string;
  is_read: boolean;
}

// RSS 订阅类型
export interface RssSubscription {
  id: number;
  rss_url: string;
  feed_title?: string | null;
  feed_link?: string | null;
  feed_description?: string | null;
  feed_published_at?: string | null;
  entry_count?: number;
  last_fetched_at?: string | null;
  created_at: string | null;
}

// 推荐网站
export interface Website {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  category: string;
  tags: string[];
}

// RSS 文章分页响应类型
export interface RssArticleListResponse {
  items: RssArticle[];
  total: number;
  page: number;
  limit: number;
}
