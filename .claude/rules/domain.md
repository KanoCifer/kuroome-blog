# Domain Glossary

| 术语 | 含义 |
|---|---|
| Book | 核心领域实体。存在全局书库中（PostgreSQL `book` 表），用户通过 `user_book` 关联持有个人副本和阅读状态 |
| Reading List | 用户的书架概念，由 `user_book` 连接表实现。每个用户持有一组 Book，每本有独立的完成状态 |
| User | 系统用户，支持密码/Passkey/GitHub OAuth 三种认证方式。`id == 1` 或 `id == 2` 为管理员 |
| Post | 博客文章，存储在 MongoDB，支持 Markdown/HTML 正文、分类、评论、点赞 |
| Subscription | 订阅管理（v2），记录用户的付费订阅信息，支持多渠道到期提醒（Email/Bark/飞书） |
| DeviceTrack | 设备追踪（v2），记录用户拥有的实体设备，支持里程碑提醒 |
| FishingRecord | 钓鱼记录（MongoDB），包含天气/潮汐/用户反馈和专家评分（受 sklearn Ridge 模型校准） |
| WeRead (微信读书) | 外部书源，用户通过 cookie 导入微信读书书架 |
| Admin | 非角色系统。硬编码 `user.id in (1, 2)` 为管理员，可用于内容审核、部署触发 |
