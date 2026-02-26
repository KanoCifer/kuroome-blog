# frontend/ — Vue 3 SPA

> Vue 3.5 + TypeScript + Tailwind CSS v4 frontend application.

## Overview

Single-page application running on Vite dev server at `:5173`. Communicates with FastAPI backend at `:5555` via `/api/*` proxy.

## Structure

```
frontend/
├── src/
│   ├── main.ts           # App bootstrap, Pinia, Router
│   ├── App.vue          # Root component
│   ├── components/       # Vue components (16 .vue files)
│   │   └── icons/       # Icon components
│   ├── views/           # Page-level components (12 files)
│   ├── stores/          # Pinia state stores (4 stores)
│   ├── router/          # Vue Router config
│   ├── composables/     # Vue composables
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Utility functions
│   └── layouts/         # Layout components
├── index.html           # HTML entry point
├── vite.config.ts       # Vite config, dev proxy
├── package.json         # Node dependencies
├── tsconfig.json        # TypeScript config
├── vitest.config.ts     # Unit test config
└── eslint.config.ts     # ESLint config
```

## Entry Points

- **HTML:** `index.html` → loads `src/main.ts`
- **TS:** `src/main.ts` → creates Vue app with Pinia, Router, Head
- **Root:** `src/App.vue` → uses `BasicLayout`, SEO metadata

## Dev Server

- **URL:** `http://localhost:5173`
- **Proxy:** `/api/v1/*` → `http://localhost:5555` (FastAPI)
- **FastAPI:** `/api/v1/*` at `:5555`

## Code Style

- **Indent:** 2 spaces
- **Quotes:** Single (Vue), Double (TS)
- **Semicolons:** Yes
- **Path alias:** `@/` → `./src/`
- **Components:** PascalCase files, `<script setup lang="ts">`

## State Management (Pinia)

```typescript
import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({ user: null, token: "" }),
  actions: {
    async login(credentials) { /* ... */ },
  },
});
```

## Key Dependencies

- vue, vue-router, pinia (core)
- @vueuse/core (composables)
- axios (HTTP client)
- tailwindcss, @tailwindcss/* (styling)
- @tiptap/vue-3 (rich text)
- element-plus (UI components)

## Commands

```bash
npm run dev             # Vite dev server :5173
npm run build           # Production build
npm run test:unit       # Vitest
npm run test:unit:ui   # Vitest UI
npm run lint            # ESLint + Oxlint
npm run format          # Prettier
```

## Testing

- Tests in `src/**/*.test.ts` via Vitest
- Component tests in `components/__tests__/*.spec.ts`
- Run: `npm run test:unit`

## Notes

- Vite proxy correctly points to FastAPI at :5555
- Use `@/` alias for imports from `./src/`
- Follow Vue 3 Composition API patterns with `<script setup>`
