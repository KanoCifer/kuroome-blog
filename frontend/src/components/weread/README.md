# 书籍详情面板组件

点击书籍卡片后弹出的浮层式详情面板。

## 文件

| 文件 | 角色 |
|---|---|
| WereadBookCard.vue | 卡片(可点击触发面板) |
| WereadBookDetailPanel.vue | 详情面板(Teleport 到 body) |
| composables/useWereadBookDetailSingleton.ts | **模块级单例** 状态:当前打开的书 + open |
| composables/useWereadBookProgress.ts | 进度 fetch + 30s 内存 cache |
| utils/format.ts | 时间/百分比/封面渐变 |

## 用法

```vue
<script setup>
import WereadBookCard from '@/components/weread/WereadBookCard.vue';
import WereadBookDetailPanel from '@/components/weread/WereadBookDetailPanel.vue';
import { useWereadBookDetailSingleton } from '@/components/weread/composables/useWereadBookDetailSingleton';

const { selectedBook, isOpen, selectBook, close } = useWereadBookDetailSingleton();
</script>

<template>
  <WereadBookCard
    v-for="book in books"
    :key="book.bookId"
    :book="book"
    @click="selectBook(book)"
  />

  <WereadBookDetailPanel
    :book="selectedBook"
    :open="isOpen"
    @close="close"
  />
</template>
```

> ⚠️ `useWereadBookDetailSingleton` 是**模块级单例** — 整个应用共享同一份状态。
> 函数名后缀 `Singleton` 是显式契约,不要在测试里连续调两次并期望隔离。
> 需要多 panel 时改用 `provide/inject` 在父级拥有自己的 ref。

## WereadBookCard

- `corner-tl` 命名 slot:封面左上角覆盖物(例如 rail 的"刚刚/3 天前"recency 角标)

## 演示路由

/dev/book-detail — 6 本 mock 书,覆盖在读/已读/待读三种状态。
