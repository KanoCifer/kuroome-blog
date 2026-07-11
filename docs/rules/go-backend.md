# Go Backend (`go-backend/`)

Python `backend/` 的 Go 重构（核心功能已实现，持续完善中）。路由前缀 `/api/v3/*`，运行于 `127.0.0.1:5555`。

## 运行 & 测试

```bash
cd go-backend
go run ./cmd/server      # 启动 -> 127.0.0.1:5555
go test ./...            # 全量单测（handler/service/dto/middleware/jwt 均有覆盖，含 admin 端）
```

## 框架 & 分层

- **框架**：Gin + GORM(PostgreSQL) + MongoDB driver(v2) + go-redis(v9)；JWT HS256 + bcrypt；配置用 Viper
- **分层**：`handler → service → repository → model`，响应统一包 `internal/response/`（`Success` / `APIError` 封装 `{data, message}` 信封）
- **解耦**：handler 通过接口（`UserService` / `AdminService`）依赖 service，便于 mock 测试
- **包布局**：`internal/{config,db,dto,handler,middleware,model,mongo,repository,response,service,router}`；`pkg/jwt`（JWT 工具）；`pkg/notification/`（通知通道）；`logger/`（独立日志包）
- **命名对齐**：复用 Python 后端的 `.env`（`DATABASE_URL / SECRET_KEY / REDIS_URL / MONGO_URI / PORT` 等）
- **配置注入**：新 service/handler 通过构造函数接收配置，避免直接读取全局 `config.Cfg`（旧代码仍有残留，迁移中）

## 鉴权

认证统一契约见 **[auth.md](auth.md)**。Go 端要点:

- JWT: `pkg/jwt`, HS256, RegisteredClaims(sub/exp/jti)
- bcrypt: cost=DefaultCost, `$2a$` 前缀
- Refresh 白名单: `refresh:{uid}` 于 Redis,单设备轮换
- Admin: `ADMIN_USER_IDS` 白名单;AdminMiddleware 必须在 AuthMiddleware 之后
- 注册校验 Redis `signup_code:{email}`;非法 admin post id 返回 400

## 通知通道

`pkg/notification/` 实现 Bark / Feishu / Email 三种通道，由 `plugin.go` 统一注册。发送走异步队列，失败不阻塞主流程。

## 中间件

- `middleware/auth.go` — JWT 校验（`Authorization: Bearer`）
- `middleware/ratelimit.go` — Redis 滑动窗口限速，key `rl:{scope}:{ip}`，超限返回 429 + `Retry-After`
- `middleware/cors.go` — CORS（白名单由 `AMAP_KEY_ALLOWED_ORIGINS` 等配置控制）
- `middleware/slog.go` — Gin 官方推荐的 slog access log 中间件（`method/path/status/latency/trace_id` 单行结构化输出），替代 gin 默认 plaintext Logger
- `middleware/trace.go` — trace_id 注入，Slog 中间件读取同一值保证 access log 与 handler 日志串联
- `middleware/duration.go` — 请求起始时间，供 response 层写 `X-Process-Time` 头

## GitHub OAuth

`handler/github.go` + `service/github.go` 实现 GitHub 登录/绑定/解绑，需 `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_REDIRECT_URI`。

## Docker & 部署

- `go-backend/Dockerfile` — Go 服务镜像
- `docker-compose.yml`（根目录）— 应用服务编排；`docker-compose.infra.yml` — 基础设施（Postgres/Redis/Mongo）
- 部署脚本：`backend/deploy.sh`（Python 后端）；Go 部署见 `cmd/server`

## 已知遗留

- `internal/router/` 当前为空 —— 路由在 `cmd/server/main.go` 经 `handler.RegisterRoutes(...)` 内联注册到 `/api/v3` 组
- `internal/repository/mongo/`、`internal/domain/`、`internal/infra/` 仅规划、尚未创建目录
- Mongo repo 误置于 `internal/repository/postgres/`（package 名 `postgres`，实际走 MongoDB `posts` 集合）；文档模型在 `internal/mongo/document/`
