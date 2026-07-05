package db

import (
	"context"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"app/internal/config"
	"app/internal/model"
)

var (
	pgDB   *gorm.DB
	mongoClient *mongo.Client
	rdb    *redis.Client
)

func InitDB() error {
	var err error
	pgDB, err = gorm.Open(postgres.Open(config.Cfg.DATABASE_URL), &gorm.Config{})
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
	var err error
	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(config.Cfg.MONGO_URI).SetServerAPIOptions(serverAPI)
	client, err := mongo.Connect(opts)
	if err != nil {
		panic(err)
	}
	defer func() {
		if err = client.Disconnect(context.TODO()); err != nil {
			panic(err)
		}
	}()
	mongoClient = client
	return mongoClient.Ping(context.Background(), nil)
}

func GetMongo() *mongo.Client {
	return mongoClient
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
	if mongoClient != nil {
		mongoClient.Disconnect(context.Background())
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
