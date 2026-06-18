# Code Style

## Backend (FastAPI)

- Imports: absolute imports only (`from app...`)
- Naming: functions/variables `snake_case`, classes `PascalCase`
- Services raise errors, API layer maps HTTP responses
- Async: prefer async/await for DB-related operations

## Frontend (Vue + TS)

- Use `<script setup lang="ts">` + Composition API
- Type safety: avoid `any`; use `unknown` + narrowing for external inputs; keep props/emits/store types explicit
- Naming: variables/functions `camelCase`, components/types `PascalCase`, component file `PascalCase.vue/tsx`, utility file `camelCase.ts`
- Styling: prefer Tailwind utilities, NO custom CSS
- Package manager: `pnpm` only
- Error handling: async flows use try/catch; narrow caught values before property access; route user-visible failures to notification flows

## Zustand (React-app)

- Object Selectors must use `useShallow` to prevent infinite re-renders
- Avoid returning new object references in Selectors
