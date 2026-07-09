package db

import (
	"context"
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
	pgDB, err = gorm.Open(postgres.Open(config.Cfg.DATABASE_URL), &gorm.Config{
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
	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(config.Cfg.MONGO_URI).SetServerAPIOptions(serverAPI)
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
	opts, err := redis.ParseURL(config.Cfg.REDIS_URL)
	if err != nil {
		return err
	}
	rdb = redis.NewClient(opts)
	return rdb.Ping(context.Background()).Err()
}

func GetRedis() *redis.Client {
	return rdb
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
