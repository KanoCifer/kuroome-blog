package config

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/spf13/viper"
)

// Config holds all configuration for the application, sourced from environment
// variables (via Viper). Field names map 1:1 with the Python Settings class.
type Config struct {
	DATABASE_URL string `mapstructure:"DATABASE_URL"`
	SECRET_KEY   string `mapstructure:"SECRET_KEY"`
	MONGO_URI    string `mapstructure:"MONGO_URI"`
	Port         int    `mapstructure:"PORT"`

	MAIL_USERNAME string `mapstructure:"MAIL_USERNAME"`
	MAIL_PASSWORD string `mapstructure:"MAIL_PASSWORD"`

	API_VERSION     string `mapstructure:"API_VERSION"`
	API_TITLE       string `mapstructure:"API_TITLE"`
	API_DESCRIPTION string `mapstructure:"API_DESCRIPTION"`
	API_KEY         string `mapstructure:"API_KEY"`

	// WebAuthn / Passkey settings
	WEBAUTHN_RP_ID  string `mapstructure:"WEBAUTHN_RP_ID"`
	WEBAUTHN_ORIGIN string `mapstructure:"WEBAUTHN_ORIGIN"`

	GITHUB_CLIENT_ID     string `mapstructure:"GITHUB_CLIENT_ID"`
	GITHUB_CLIENT_SECRET string `mapstructure:"GITHUB_CLIENT_SECRET"`
	GITHUB_REDIRECT_URI  string `mapstructure:"GITHUB_REDIRECT_URI"`

	FRONTEND_URL string `mapstructure:"FRONTEND_URL"`

	GITEE_WEBHOOK_SECRET *string `mapstructure:"GITEE_WEBHOOK_SECRET"`

	SEND_BOOT_EMAIL bool   `mapstructure:"SEND_BOOT_EMAIL"`
	ADMIN_EMAIL     string `mapstructure:"ADMIN_EMAIL"`

	FEISHU_WEBHOOK_URL string `mapstructure:"FEISHU_WEBHOOK_URL"`

	VITE_JS_API_TOKEN string `mapstructure:"VITE_JS_API_TOKEN"`

	AMAP_SECURITY_CODE       string   `mapstructure:"AMAP_SECURITY_CODE"`
	AMAP_WEB_KEY             string   `mapstructure:"AMAP_WEB_KEY"`
	AMAP_KEY_ALLOWED_ORIGINS []string `mapstructure:"-"` // derived from AMAP_KEY_ALLOWED_ORIGINS env string

	JWT_PRIVATE_KEY string `mapstructure:"JWT_PRIVATE_KEY"`

	COOKIE_DOMAIN string `mapstructure:"COOKIE_DOMAIN"`

	// Redis configuration
	REDIS_URL             string `mapstructure:"REDIS_URL"`
	REDIS_MAX_CONNECTIONS int    `mapstructure:"REDIS_MAX_CONNECTIONS"`

	RABBITMQ_URL string `mapstructure:"RABBITMQ_URL"`

	QWEATHER_BASE_URL string `mapstructure:"QWEATHER_BASE_URL"`

	ENABLE_TRACKING bool `mapstructure:"ENABLE_TRACKING"`

	ADMIN_USER_IDS []int `mapstructure:"-"` // derived from ADMIN_USER_IDS env string

	SAVE_LOGS    bool   `mapstructure:"SAVE_LOGS"`
	DB_LOG_LEVEL string `mapstructure:"DB_LOG_LEVEL"`
	LOG_LEVEL    string `mapstructure:"LOG_LEVEL"`
}

var defaults = map[string]any{
	"DATABASE_URL":             "",
	"SECRET_KEY":               "",
	"MONGO_URI":                "",
	"PORT":                     5555,
	"MAIL_USERNAME":            "",
	"MAIL_PASSWORD":            "",
	"API_VERSION":              "4.0.0",
	"API_TITLE":                "Reading List API",
	"API_DESCRIPTION":          "API文档。Personal reading tracker API built with FastAPI, PostgreSQL, and MongoDB.",
	"API_KEY":                  "",
	"WEBAUTHN_RP_ID":           "kanocifer.chat",
	"WEBAUTHN_ORIGIN":          "https://kanocifer.chat",
	"GITHUB_CLIENT_ID":         "",
	"GITHUB_CLIENT_SECRET":     "",
	"GITHUB_REDIRECT_URI":      "",
	"FRONTEND_URL":             "https://kanocifer.chat",
	"GITEE_WEBHOOK_SECRET":     nil,
	"SEND_BOOT_EMAIL":          true,
	"ADMIN_EMAIL":              "",
	"FEISHU_WEBHOOK_URL":       "",
	"VITE_JS_API_TOKEN":        "",
	"AMAP_SECURITY_CODE":       "",
	"AMAP_WEB_KEY":             "",
	"AMAP_KEY_ALLOWED_ORIGINS": "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,https://kanocifer.chat,https://m.kanocifer.chat",
	"JWT_PRIVATE_KEY":          "",
	"COOKIE_DOMAIN":            "",
	"REDIS_URL":                "redis://localhost:6379/0",
	"REDIS_MAX_CONNECTIONS":    50,
	"RABBITMQ_URL":             "amqp://guest:guest@localhost:5672/",
	"QWEATHER_BASE_URL":        "",
	"ENABLE_TRACKING":          true,
	"ADMIN_USER_IDS":           "1,2",
	"SAVE_LOGS":                true,
	"LOG_LEVEL":                "INFO",
	"DB_LOG_LEVEL":             "WARNING",
}

var Cfg *Config

// Load reads configuration with the precedence: env vars > config file > defaults.
// If cfgFile is non-empty it is used as an explicit path; otherwise Load looks for
// "configs/config.yaml" relative to the working directory.
func Load(cfgFile ...string) (*Config, error) {
	for k, v := range defaults {
		viper.SetDefault(k, v)
	}

	if len(cfgFile) > 0 && cfgFile[0] != "" {
		viper.SetConfigFile(cfgFile[0])
	} else {
		viper.SetConfigName("config")
		viper.SetConfigType("yaml")
		viper.AddConfigPath("./configs")
		viper.AddConfigPath(".")
	}

	// ReadInConfig is a no-op when the file is missing; only fail on parse errors.
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("read config file: %w", err)
		}
	}

	viper.AutomaticEnv()

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, err
	}

	// AMAP_KEY_ALLOWED_ORIGINS and ADMIN_USER_IDS are comma-separated strings
	// in env but exposed as slices; parse them separately since Viper's
	// mapstructure doesn't split strings automatically.
	if origins := viper.GetString("AMAP_KEY_ALLOWED_ORIGINS"); origins != "" {
		cfg.AMAP_KEY_ALLOWED_ORIGINS = splitAndTrim(origins)
	}
	if ids := viper.GetString("ADMIN_USER_IDS"); ids != "" {
		cfg.ADMIN_USER_IDS = parseIntList(ids)
	}
	Cfg = &cfg

	return Cfg, nil
}

// splitAndTrim splits a comma-separated string and trims whitespace from each element.
func splitAndTrim(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

// parseIntList splits a comma-separated string of integers.
func parseIntList(s string) []int {
	parts := strings.Split(s, ",")
	out := make([]int, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			if n, err := strconv.Atoi(t); err == nil {
				out = append(out, n)
			}
		}
	}
	return out
}
