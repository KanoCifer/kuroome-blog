package logger

import (
	"log/slog"
	"os"

	"github.com/KanoCifer/kuroome-blog/internal/config"
)

// Init 初始化全局 slog logger。需在 config.Load() 之后、其他日志调用之前调用。
func Init(cfg *config.Config) {
	level := parseLevel(cfg.Server.LogLevel)
	opts := &slog.HandlerOptions{Level: level}

	var handler slog.Handler
	if cfg.Server.ENV == "prod" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}
	slog.SetDefault(slog.New(handler))
}

func parseLevel(s string) slog.Level {
	switch s {
	case "DEBUG":
		return slog.LevelDebug
	case "WARN", "WARNING":
		return slog.LevelWarn
	case "ERROR":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
