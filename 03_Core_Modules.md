# 核心模块文档

本文档描述 ReadingList 后端的核心 API 模块。v1 版本挂载在 `/api/v1` 命名空间下，v2 版本挂载在 `/api/v2` 命名空间下。

## 1. 模块概览

### v1 API（`/api/v1`）

| 模块 | 基础路由 | 说明 |
| --- | --- | --- |
| 认证 | `/api/v1/auth` | 登录、注册、JWT、Passkey、OAuth |
| 书籍 | `/api/v1/books` | 书架、书籍信息、阅读进度 |
| 博客 | `/api/v1/blog` | 文章、分类、评论、发布 |
| 留言板 | `/api/v1/messages` | 访客留言与管理回复 |
| 微信读书 | `/api/v1/weread` | 微信读书导入与同步 |
| RSS | `/api/v1/rss` | 订阅源管理、抓取、聚合 |
| 管理员 | `/api/v1/admin` | 内容审核、后台管理、权限操作 |
| AI | `/api/v1/agent` | 摘要、对话、内容增强（SSE 流式输出）|
| 待办 | `/api/v1/todos` | 任务管理与个人事项 |
| 监控 | `/api/v1/status` | 系统状态、统计、运行指标 |
| 公开 API | `/api/v1/public` | 对外公开的通用接口 |

### v2 API（`/api/v2`）

| 模块 | 基础路由 | 说明 |
| --- | --- | --- |
| 订阅管理 | `/api/v2/subscriptions` | 订阅项 CRUD、状态管理、到期提醒、通知测试 |
| 设备跟踪 | `/api/v2/device` | 用户设备管理（CRUD） |
| 钓鱼指数 | `/api/v2/fishing` | 钓鱼指数计算、反馈收集、模型权重查看 |
| 天气 | `/api/v2/weather` | 潮汐数据查询、完整天气数据获取 |

## 2. 每个模块的详细说明

### 2.1 认证模块 `/api/v1/auth`

**功能：** 负责用户注册、登录、退出、刷新令牌

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/login` | 用户名密码登录，限流 5/min |
| POST | `/logout` | 退出登录 |
| POST | `/register` | 用户注册（含邮箱验证码） |
| POST | `/email/code` | 发送邮箱验证码 |
| GET | `/refresh-token` | 刷新访问令牌 |
| GET | `/me` | 获取当前用户信息 |
| PUT | `/settings` | 更新用户设置 |
| PUT | `/upload-pic` | 上传头像 |
| GET | `/status-of-admin` | 检查管理员在线状态 |
| GET | `/csrf-token` | 获取 CSRF Token |
| POST | `/heartbeat` | 上报心跳（限流 60/min） |

**Passkey 相关：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/passkey/registration-options` | 获取 Passkey 注册选项 |
| POST | `/passkey/register` | 完成 Passkey 注册 |
| GET | `/passkey/authentication-options` | 获取 Passkey 认证选项 |
| POST | `/passkey/authenticate` | Passkey 认证登录 |
| DELETE | `/passkey/delete` | 删除已绑定的 Passkey |

**GitHub OAuth：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/github` | GitHub 登录跳转 |
| GET | `/github/bind` | 绑定 GitHub 账号 |
| POST | `/github/unbind` | 解绑 GitHub 账号 |
| GET | `/github/callback` | GitHub OAuth 回调 |

### 2.2 书籍模块 `/api/v1/books`

**功能：** 管理书籍增删改查，维护用户书架与阅读进度

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/book` | 获取书籍列表（分页、排序） |
| POST | `/books/addbook` | 添加书籍 |
| PUT | `/books/{book_id}` | 更新书籍信息 |
| DELETE | `/books/{book_id}` | 删除书籍 |
| PATCH | `/books/{book_id}/status` | 更新阅读状态（是否读完）|

### 2.3 博客模块 `/api/v1/blog`

**功能：** 管理文章发布、编辑、删除；处理分类、评论、审核；MongoDB 存储

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/blogs` | 获取文章列表（支持搜索）|
| GET | `/post` | 获取单篇文章详情（Query 参数）|
| GET | `/blogs/{_id}` | 获取单篇文章详情（Path 参数）|
| POST | `/comments` | 提交评论（待审核）|
| GET | `/categories` | 获取全部分类及文章数 |
| POST | `/category` | 按分类获取文章（Query）|
| GET | `/blogs/categories/{category_id}` | 按分类获取文章（Path）|
| POST | `/upload-image` | 上传博客图片 |

### 2.4 留言板模块 `/api/v1/messages`

**功能：** 提供访客留言功能，支持留言审核、管理员回复

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/messages` | 获取已通过的留言列表 |
| POST | `/messages` | 提交留言（限流 10/min，管理员留言直接通过）|

### 2.5 微信读书模块 `/api/v1/weread`

**功能：** 同步微信读书书架、笔记、划线内容

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/import` | 导入微信读书书籍（需提供 weread_cookie）|

### 2.6 RSS 模块 `/api/v1/rss`

**功能：** 管理 RSS 订阅源，定时抓取内容并解析，支持文章去重、缓存与已读状态

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/image-proxy` | 代理 RSS 图片（解决跨域）|
| POST | `/parse-rss` | 解析 RSS 链接（可选择是否保存）|
| GET | `/articles` | 获取文章列表（分页、过滤）|
| GET | `/articles/{article_id}` | 获取文章详情 |
| GET | `/subscriptions` | 获取用户的 RSS 订阅列表 |
| POST | `/subscriptions/{subscription_id}/refresh` | 手动刷新订阅 |
| DELETE | `/subscriptions/{subscription_id}` | 删除订阅及其文章 |
| POST | `/articles/{article_id}/read` | 标记文章为已读 |
| DELETE | `/articles/{article_id}/read` | 标记文章为未读 |

### 2.7 管理员模块 `/api/v1/admin`

**功能：** 提供后台审核与管理能力，负责内容状态控制、用户管理、系统配置

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/post/add` | 发布文章 |
| PUT | `/post/update` | 更新文章 |
| DELETE | `/post/{post_id}/delete` | 删除文章 |
| GET | `/comments` | 获取待审核评论 |
| POST | `/comments/{comment_id}/approve` | 审核通过评论 |
| DELETE | `/comments/{comment_id}/delete` | 删除评论 |
| GET | `/messages` | 获取全部留言（含待审核）|
| POST | `/messages/{message_id}/approve` | 审核通过留言 |
| DELETE | `/messages/{message_id}/delete` | 删除留言 |
| POST | `/track` | 追踪访客数据 |
| POST | `/deploy` | Gitee Webhook 自动部署 |

### 2.8 AI 模块 `/api/v1/agent`

**功能：** 为书籍或文章生成摘要，提供内容润色、问答等能力（SSE 流式输出），结合 Redis 做结果缓存

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/summary/stream` | 文章摘要生成（流式）|
| POST | `/chat/stream` | AI 对话（流式）|
| GET | `/history` | 获取用户历史记录 |
| POST | `/history/summary` | 获取缓存的摘要 |
| POST | `/history/chat` | 获取缓存的对话 |
| GET | `/debug/sessions` | 调试：获取会话列表 |

### 2.9 待办模块 `/api/v1/todos`

**功能：** 管理个人待办事项，轻量任务记录和状态跟踪，与用户账号强绑定

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/todos` | 获取待办列表（支持 include_archived）|
| POST | `/todos` | 创建待办 |
| PATCH | `/todos/{todo_id}` | 部分更新待办 |
| DELETE | `/todos/{todo_id}` | 删除待办 |
| POST | `/todos/batch` | 批量操作（归档已完成、清除已完成）|

### 2.10 监控模块 `/api/v1/status`

**功能：** 输出系统健康状态、访问统计、任务状态，用于运维和后台可视化

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/status/overview` | 访客概览统计 |
| GET | `/status/visitors` | 访客列表（分页）|
| GET | `/status/user-logins` | 用户登录日志 |
| GET | `/status/server/status` | 服务器状态 |
| GET | `/status/server/status/stream` | 服务器状态（SSE 流式）|
| GET | `/status/online-users` | 在线用户列表 |

### 2.11 公开 API 模块 `/api/v1/public`

**功能：** 为外部页面或第三方提供无需复杂认证的公共接口

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/public/status` | API 运行状态 |
| GET | `/public/robots.txt` | robots.txt 文件 |
| GET | `/public/sitemap.xml` | sitemap.xml（SEO）|
| POST | `/public/like` | 点赞（限流 25/day）|
| GET | `/public/likes` | 获取点赞数 |
| GET | `/public/amap/security-key` | 高德地图安全密钥（限流 10/hr）|
| POST | `/public/weather` | 天气查询（限流 100/hr）|
| POST | `/public/geocode/regeo` | 逆地理编码（限流 100/hr）|
| GET | `/public/qweather/tide` | 全球天气查询（限流 100/hr）|
| GET | `/public/qweather/location` | 景点位置查询（限流 100/hr）|
| POST | `/public/llm/weather-analysis` | 天气数据分析（SSE 流式，限流 50/hr）|
| POST | `/public/upload-gallery-image` | 上传图片到图床 |
| POST | `/public/set-pic-gallery` | 设置图库 |
| GET | `/public/pic-gallery` | 获取图库列表 |

### 2.12 订阅管理模块 `/api/v2/subscriptions`

**功能：** 订阅项全生命周期管理，支持多渠道通知（Email、Bark、Feishu、Server酱等）

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/subscriptions` | 获取订阅列表 |
| GET | `/subscriptions/{sub_id}` | 获取订阅详情 |
| POST | `/subscriptions` | 创建订阅 |
| PUT | `/subscriptions/{sub_id}` | 更新订阅 |
| DELETE | `/subscriptions/{sub_id}` | 删除订阅 |
| PATCH | `/subscriptions/{sub_id}/status` | 更新订阅状态 |
| PATCH | `/subscriptions/{sub_id}/reminders` | 更新提醒配置 |
| GET | `/subscriptions/upcoming` | 获取即将到期的订阅 |
| POST | `/subscriptions/{sub_id}/test-notification` | 测试通知发送 |

### 2.13 设备跟踪模块 `/api/v2/device`

**功能：** 管理用户设备信息，用于设备识别与追踪

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/device` | 获取设备列表 |
| GET | `/device/{device_id}` | 获取设备详情 |
| POST | `/device` | 创建设备 |
| PUT | `/device/{device_id}` | 更新设备信息 |
| DELETE | `/device/{device_id}` | 删除设备 |
| DELETE | `/device` | 删除全部设备 |

### 2.14 钓鱼指数模块 `/api/v2/fishing`

**功能：** 基于专家公式和机器学习模型计算钓鱼指数，支持用户反馈收集与模型自动训练

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/fishing/index` | 获取指定地点钓鱼指数（支持 enriched 模式附加天气数据）|
| POST | `/fishing/feedback` | 提交钓鱼体验反馈（保存至 MongoDB，触发自动训练）|
| GET | `/fishing/weights` | 查看模型权重（专家权重 + sklearn 残差模型权重，需登录）|

### 2.15 天气模块 `/api/v2/weather`

**功能：** 提供潮汐数据和完整天气数据的查询，支持 Redis 缓存

**主要端点：**
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/weather/tide` | 获取潮汐数据（Query: date, harbor）|
| GET | `/weather/full` | 获取完整天气数据（Query: location 经纬度）|

## 3. 关键业务逻辑链

### 3.1 书籍业务链

用户登录 → 添加书籍 / 导入书籍 → 写入书架 → 更新阅读进度 → 生成统计数据。

### 3.2 博客业务链

管理员发布文章 → 分类入库 → 用户浏览 → 评论/留言 → 审核与展示。

### 3.3 RSS 业务链

用户订阅 RSS → 定时抓取源站 → 解析条目 → 去重入库 → 供前端阅读。

### 3.4 微信读书同步链

提交同步请求 → 拉取外部数据 → 解析书名/笔记/进度 → 合并书架数据 → 更新本地库。

### 3.5 订阅提醒业务链

用户创建订阅 → 设置提醒渠道与到期提前天数 → 系统定时检查 → 到期前 N 天发送通知 → 用户处理续费/取消。

### 3.6 AI 服务业务链

用户请求摘要/对话 → 检查 Redis 缓存 → 命中则返回 → 未命中则调用 LLM → 流式输出 → 写入缓存供后续查询。

## 4. 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {},
}
```

- `code`：业务状态码
- `message`：人类可读提示
- `data`：实际返回数据

## 5. 权限控制原则

- **游客**：可访问公开 API（`/api/v1/public/*`）、博客列表、留言板展示、监控公开信息
- **登录用户**：可使用书籍、RSS、待办、AI、订阅管理、设备跟踪等个人功能
- **管理员**：可访问后台审核（`/api/v1/admin/*`）、内容管理、系统配置与敏感监控信息（`/api/v1/status/*`）

## 6. API 版本说明

- **v1（`/api/v1/*`）**：主体业务 API，包含认证、书籍、博客、RSS、AI、待办等核心模块
- **v2（`/api/v2/*`）**：扩展功能 API，包含订阅管理和设备跟踪等较新模块
