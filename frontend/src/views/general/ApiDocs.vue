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
