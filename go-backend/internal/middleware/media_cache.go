package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// MediaCacheMiddleware 给 /api/v3/media/* 的静态文件响应打上公共缓存头，
// 使 EdgeOne / CloudFront 等 CDN 能缓存命中，避免每次回源 MISS。
//
// max-age 取 7 天：上传文件以 uuid 命名，内容不可变，可以放心长缓存。
// 客户端刷新页面时 CDN 直接返回 HIT，不再回源。
func MediaCacheMiddleware() gin.HandlerFunc {
	const cc = "public, max-age=604800" // 7d
	return func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/v3/media") {
			c.Header("Cache-Control", cc)
		}
		c.Next()
	}
}
