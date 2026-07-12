package mongodb

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
)

const blogCollection = "posts"

type BlogRepository struct {
	db *mongo.Collection
}

func NewBlogRepository(db *mongo.Database) *BlogRepository {
	return &BlogRepository{db: db.Collection(blogCollection)}
}

// ListPosts 分页列出文章。search 非空时走 $text 全文搜索
// （依赖 posts 集合的文本索引），按相关度 > 置顶 > 创建时间排序；
// 否则按置顶 > 创建时间排序。返回文章列表与总数。
func (r *BlogRepository) ListPosts(
	ctx context.Context,
	page, perPage int,
	search string,
) ([]document.Post, int64, error) {
	filter := bson.M{}
	if search != "" {
		filter = bson.M{"$text": bson.M{"$search": search}}
	}

	total, err := r.db.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	sort := bson.D{
		{Key: "is_pinned", Value: -1},
		{Key: "created_at", Value: -1},
	}
	if search != "" {
		sort = append(bson.D{{Key: "score", Value: bson.M{"$meta": "textScore"}}}, sort...)
	}

	skip := int64((page - 1) * perPage)
	opts := options.Find().
		SetSort(sort).
		SetSkip(skip).
		SetLimit(int64(perPage))

	cursor, err := r.db.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var posts []document.Post
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, 0, err
	}
	return posts, total, nil
}

// AggregateTagCounts 聚合每个标签的文章数，按数量降序、标签名升序。
func (r *BlogRepository) AggregateTagCounts(ctx context.Context) ([]dto.TagOut, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$unwind", Value: "$tags"}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$tags",
			"count": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{
			"count": -1,
			"_id":   1,
		}}},
	}

	cursor, err := r.db.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	results := []dto.TagOut{}
	for cursor.Next(ctx) {
		var doc struct {
			ID    string `bson:"_id"`
			Count int    `bson:"count"`
		}
		if err := cursor.Decode(&doc); err != nil {
			return nil, err
		}
		if doc.ID == "" {
			continue
		}
		results = append(results, dto.TagOut{Name: doc.ID, Count: doc.Count})
	}
	return results, cursor.Err()
}

// GetPostByID 按 ObjectId 查找单篇文章。id 格式非法时返回 nil, error。
func (r *BlogRepository) GetPostByID(ctx context.Context, id string) (*document.Post, error) {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var post document.Post
	err = r.db.FindOne(ctx, bson.M{"_id": oid}).Decode(&post)
	if err != nil {
		return nil, err
	}
	return &post, nil
}

// IncrementViews 原子递增单篇文章的浏览量 —— 用于阅读计数。
// 仅更新 views 字段，不影响其它字段或 UpdatedAt。
func (r *BlogRepository) IncrementViews(ctx context.Context, id string) error {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	res, err := r.db.UpdateOne(
		ctx,
		bson.M{"_id": oid},
		bson.M{"$inc": bson.M{"views": 1}},
	)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}
	return nil
}

// IncrementLikes 原子递增单篇文章的喜欢数并返回递增后的值。
// 通过 FindOneAndUpdate + ReturnDocument(After) 在一次往返中完成 $+读取，
// 避免 UpdateOne 后再单独 GetPostByI​D 的两次往返与 TOCTOU 窗口。
func (r *BlogRepository) IncrementLikes(ctx context.Context, id string) (int, error) {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return 0, err
	}
	var updated struct {
		Likes int `bson:"likes"`
	}
	err = r.db.FindOneAndUpdate(
		ctx,
		bson.M{"_id": oid},
		bson.M{"$inc": bson.M{"likes": 1}},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&updated)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return 0, mongo.ErrNoDocuments
		}
		return 0, err
	}
	return updated.Likes, nil
}

// ListPostsByTag 按标签分页列出文章，按置顶 > 创建时间排序。
func (r *BlogRepository) ListPostsByTag(
	ctx context.Context,
	tag string,
	page, perPage int,
) ([]document.Post, int64, error) {
	filter := bson.M{"tags": tag}

	total, err := r.db.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	sort := bson.D{
		{Key: "is_pinned", Value: -1},
		{Key: "created_at", Value: -1},
	}
	skip := int64((page - 1) * perPage)
	opts := options.Find().
		SetSort(sort).
		SetSkip(skip).
		SetLimit(int64(perPage))

	cursor, err := r.db.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var posts []document.Post
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, 0, err
	}
	return posts, total, nil
}
