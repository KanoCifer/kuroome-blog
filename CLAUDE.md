# CLAUDE.md

## 1) Agent Rules (Highest Priority)

- 用户使用中文提问时，使用中文回复。
- 编辑已有文件时，使用增量修改，不做无关重写。
- 修改前端代码后，必须运行：`pnpm run type-check`。
- **不要自动运行 `pnpm run build`**，除非用户明确要求。
- 提交前执行对应语言的格式化与 lint。
- 添加必要的代码注释和Docstring。
- 回复保持简洁、技术化。
- `/init` 类任务仅更新 `CLAUDE.md`，不要创建/修改 `AGENTS.md`。
> 需要后端接口时 访问./03_Core_Modules.md，新增接口时更新该文件。

## Approach

- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read unless the file may have changed.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct.
- User instructions always override this file.

---

## 2) Project Overview

- Stack: FastAPI + Vue 3(desktop) + React(mobile) + TypeScript

---

## 3) Commands

> Commands should run in the indicated directory.

### Backend

```bash
# run dev server
python3 dev.py

# migrations
alembic revision --autogenerate -m "desc"
alembic upgrade head
```

### Frontend (`cd frontend`)

```bash

# build (only if user asks)
pnpm run build
pnpm run build-only

# vitest
```

### React-app (`cd react-app`)

```bash

# build (only if user asks)
pnpm run build
```

## 4) Code Style Guidelines

### Backend (Python)

- Imports:
  - absolute imports only (`from app...`)
- Naming:
  - functions/variables: `snake_case`
  - classes: `PascalCase`
  - constants: `UPPER_SNAKE_CASE`
- Error handling:
  - never use bare `except:`
  - services raise domain errors, API layer maps HTTP responses
  - never swallow errors silently
- Async: prefer async/await for DB-related operations

### Frontend (Vue + TypeScript)

- Use `<script setup lang="ts">` + Composition API
- Type safety:
  - avoid `any`
  - use `unknown` + narrowing for external inputs
  - keep props/emits/store types explicit
- Naming:
  - variables/functions: `camelCase`
  - components/types: `PascalCase`
  - component file: `PascalCase.vue/tsx`
  - utility file: `camelCase.ts`
- Styling: prefer Tailwind utilities **NO** custom CSS
- Package manager: frontend uses `pnpm` only
- Error handling:
  - async flows use try/catch
  - narrow caught values before property access
  - route user-visible failures to notification flows
---

## 5) Architecture & Boundaries

- Backend layering: `api -> service -> repository`
- Keep business logic in services; keep data access in repositories
- Keep request/response contracts in schemas

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->