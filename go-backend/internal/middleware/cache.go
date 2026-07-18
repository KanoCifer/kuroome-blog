package middleware

import "github.com/gin-gonic/gin"

func CacheController(cache ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if len(cache) == 0 {
			cache = []string{"public, max-age=600"}
		}
		c.Header("Cache-Control", cache[0])
	}
}
