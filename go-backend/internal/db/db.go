package db

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"go.mongodb.org/mongo-driver/v2/mongo/readpref"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/model"
)

var (
	pgDB   *gorm.DB
	client *mongo.Client
	rdb    *redis.Client
)

func InitDB() error {
	var err error
	dsn := databaseURL()
	pgDB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		NamingStrategy: model.NewNamer(),
	})
	if err != nil {
		return err
	}
	return pgDB.AutoMigrate(
		&model.User{},
		&model.Profile{},
		&model.VisitorTrack{},
		&model.RssInfo{},
		&model.PasskeyCredential{},
		&model.Subscription{},
		&model.DeviceTrack{},
		&model.GalleryImage{},
		&model.Log{},
	)
}

func GetDB() *gorm.DB {
	return pgDB
}

func InitMongo() error {
	uri := config.Cfg.Database.MongoURI
	if uri == "" {
		slog.Info("[mongo] MONGO_URI not configured, skipping")
		return nil
	}
	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(uri).SetServerAPIOptions(serverAPI)
	c, err := mongo.Connect(opts)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := c.Ping(ctx, readpref.Primary()); err != nil {
		return err
	}
	client = c
	return nil
}

func GetMongo() *mongo.Client {
	return client
}

func InitRedis() error {
	opts, err := redis.ParseURL(config.Cfg.Database.RedisURL)
	if err != nil {
		return err
	}
	rdb = redis.NewClient(opts)
	return rdb.Ping(context.Background()).Err()
}

func GetRedis() *redis.Client {
	return rdb
}

// databaseURL 优先从环境变量 DATABASE_URL 读取，回退到 config.Cfg。
// viper 的 AutomaticEnv 在 mapstructure 值为空字符串时不覆盖 default，
// 导致 viper 读到的 DATABASE_URL 常为空；直接从 os 读可以绕过这个问题。
func databaseURL() string {
	if url := os.Getenv("DATABASE_URL"); url != "" {
		return url
	}
	if cfg := config.Cfg; cfg != nil && cfg.Database.DatabaseURL != "" {
		return cfg.Database.DatabaseURL
	}
	return ""
}

func Close() {
	if client != nil {
		client.Disconnect(context.Background())
	}
	if rdb != nil {
		rdb.Close()
	}
	if pgDB != nil {
		sqlDB, _ := pgDB.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	}
}
