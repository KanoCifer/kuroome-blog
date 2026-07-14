// Command gen-devtask-token 生成 devtask / MCP 专用 service-JWT。
//
// 用法:
//
//	DEV_TASK_SECRET=your-secret go run ./cmd/gen-devtask-token
//	DEV_TASK_SECRET=your-secret go run ./cmd/gen-devtask-token -days 30
//
// 直接读取环境变量 DEV_TASK_SECRET，不依赖 config 包或 .env 加载。
package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/KanoCifer/kuroome-blog/pkg/jwt"
)

func main() {
	days := flag.Int("days", 365, "token validity in days")
	flag.Parse()

	secret := os.Getenv("DEV_TASK_SECRET")
	if secret == "" {
		log.Fatal("DEV_TASK_SECRET environment variable is not set")
	}

	expiresAt := time.Now().AddDate(0, 0, *days)
	token, err := jwt.GenerateServiceToken(expiresAt, secret)
	if err != nil {
		log.Fatalf("generate token: %v", err)
	}

	fmt.Printf("devtask service token (expires: %s)\n", expiresAt.Format("2006-01-02"))
	fmt.Println(token)
}
