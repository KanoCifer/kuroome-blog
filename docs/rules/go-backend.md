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
- **包布局**：`internal/{config,db,dto,handler,middleware,model,mongo,repository,response,service,router}`；`pkg/jwt`（JWT 工具）
- **命名对齐**：复用 Python 后端的 `.env`（`DATABASE_URL / SECRET_KEY / REDIS_URL / MONGO_URI / PORT` 等）

## 鉴权差异（与 Python 端对齐）

- admin 鉴权走 `middleware.AdminMiddleware()`，依据 `ADMIN_USER_IDS` 配置（非硬编码）
- Go `User` model 无 `is_admin` 字段；登录态 `is_admin` 由 `ADMIN_USER_IDS` 判定
- 注册时 `email_code` 真正校验 Redis `signup_code:{email}`；非法 admin post id 返回 400

## 已知遗留

- `internal/router/` 当前为空 —— 路由在 `cmd/server/main.go` 经 `handler.RegisterRoutes(...)` 内联注册到 `/api/v3` 组
- `internal/repository/mongo/`、`internal/domain/`、`internal/infra/` 仅规划、尚未创建目录
- Mongo repo 误置于 `internal/repository/postgres/`（package 名 `postgres`，实际走 MongoDB `posts` 集合）；文档模型在 `internal/mongo/document/`
