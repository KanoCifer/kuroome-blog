import axios from "axios";
import { createWriteStream } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

interface BlogPost {
  _id: string;
  created_at: string;
  updated_at?: string;
}

interface BlogCategory {
  id: string | number;
}

interface PostApiResponse {
  data?: {
    posts?: BlogPost[];
  };
}

interface CategoryApiResponse {
  data?: {
    categories?: BlogCategory[];
  };
}

// 获取当前文件所在目录的路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

// 配置
const BASE_URL = "https://kanocifer.com"; // 替换为你的实际域名
const API_BASE = "http://localhost:5050/api"; // 后端 API 地址
const OUTPUT_PATH = resolve(__dirname, "public/sitemap.xml");

// 获取博客文章数据的函数
async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    const response = await axios.get<PostApiResponse>(`${API_BASE}/post`);
    return response.data.data?.posts || []; // 根据你的实际 API 响应结构调整
  } catch (error) {
    console.error("获取博客文章数据失败:", error);
    return [];
  }
}

// 获取博客分类数据的函数
async function fetchBlogCategories(): Promise<BlogCategory[]> {
  try {
    const response = await axios.get<CategoryApiResponse>(`${API_BASE}/category`);
    return response.data.data?.categories || []; // 根据你的实际 API 响应结构调整
  } catch (error) {
    console.error("获取博客分类数据失败:", error);
    return [];
  }
}

// 生成 sitemap.xml 的函数
async function generateSitemap() {
  console.log("开始生成 sitemap.xml...");

  // 获取数据
  const [posts, categories] = await Promise.all([fetchBlogPosts(), fetchBlogCategories()]);

  // 构建 XML 内容
  let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 静态页面 -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/about</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/blog</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

  // 添加博客文章
  posts.forEach((post) => {
    xmlContent += `
  <url>
    <loc>${BASE_URL}/blog/${post._id}</loc>
    <lastmod>${new Date(post.updated_at || post.created_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  // 添加博客分类
  categories.forEach((category) => {
    xmlContent += `
  <url>
    <loc>${BASE_URL}/blog/category/${category.id}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
  });

  xmlContent += `
</urlset>`;

  // 写入文件
  try {
    createWriteStream(OUTPUT_PATH).write(xmlContent);
    console.log(`sitemap.xml 生成成功！已保存到 ${OUTPUT_PATH}`);
    console.log(`包含 ${posts.length} 篇博客文章和 ${categories.length} 个分类`);
  } catch (error) {
    console.error("写入 sitemap.xml 失败:", error);
  }
}

// 执行生成
generateSitemap().catch(console.error);
