package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// 一次性 migration: 给老任务补默认 for_agent=false + blocked_by=[]。
// 不跑这个的话 FindFrontier 永远不会匹配老文档（它们连 blocked_by 字段都没有）。
//
// 用法:
//   go run scripts/migrate_devtask/main.go -uri "mongodb://localhost:27017" -db your_db
//
// 安全: UpdateMany 的 $set 只增加字段，不覆盖现有字段。已经有的文档不受影响。

func main() {
	uri := flag.String("uri", "mongodb://localhost:27017", "MongoDB connection URI")
	dbName := flag.String("db", "kuroome-blog", "Database name")
	dryRun := flag.Bool("dry-run", false, "Print what would happen without writing")
	flag.Parse()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(options.Client().ApplyURI(*uri))
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer client.Disconnect(ctx)

	col := client.Database(*dbName).Collection("dev_tasks")

	// 给没有 for_agent 字段的文档补 false。
	forAgentFilter := bson.M{"for_agent": bson.M{"$exists": false}}
	forAgentCount, err := col.CountDocuments(ctx, forAgentFilter)
	if err != nil {
		log.Fatalf("count missing for_agent: %v", err)
	}

	// 给没有 blocked_by 字段的文档补 []。
	blockedFilter := bson.M{"blocked_by": bson.M{"$exists": false}}
	blockedCount, err := col.CountDocuments(ctx, blockedFilter)
	if err != nil {
		log.Fatalf("count missing blocked_by: %v", err)
	}

	fmt.Printf("Tasks missing for_agent:    %d\n", forAgentCount)
	fmt.Printf("Tasks missing blocked_by:   %d\n", blockedCount)

	if *dryRun {
		fmt.Println("--dry-run set, not writing. Exit.")
		return
	}

	if forAgentCount > 0 {
		res, err := col.UpdateMany(ctx, forAgentFilter, bson.M{"$set": bson.M{"for_agent": false}})
		if err != nil {
			log.Fatalf("update for_agent: %v", err)
		}
		fmt.Printf("Updated for_agent=false on %d documents\n", res.ModifiedCount)
	}

	if blockedCount > 0 {
		res, err := col.UpdateMany(ctx, blockedFilter, bson.M{"$set": bson.M{"blocked_by": bson.A{}}})
		if err != nil {
			log.Fatalf("update blocked_by: %v", err)
		}
		fmt.Printf("Updated blocked_by=[] on %d documents\n", res.ModifiedCount)
	}

	fmt.Println("Migration done.")
}
