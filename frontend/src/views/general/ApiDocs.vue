<template>
  <div class="api-docs-container mx-auto mt-24 max-w-6xl rounded-3xl">
    <iframe
      src="/Docs"
      class="swagger-iframe"
      frameborder="0"
      title="API Documentation"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
// 这个方案最简单直接 - 使用 FastAPI 自带的 Swagger UI
// 通过 Vite 代理将 /Docs 转发到 http://localhost:5555/docs
</script>

<style scoped>
.api-docs-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #fff;
}

.swagger-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
