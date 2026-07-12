package postgres

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
)

const postsCollection = "posts"

type AdminRepo struct {
	db *mongo.Collection
}

func NewAdminRepo(db *mongo.Database) *AdminRepo {
	return &AdminRepo{db: db.Collection(postsCollection)}
}

func (r *AdminRepo) CreatePost(ctx context.Context, post *document.Post) (string, error) {
	now := time.Now().UTC()
	post.CreatedAt = now
	post.UpdatedAt = now

	res, err := r.db.InsertOne(ctx, post)
	if err != nil {
		return "", err
	}
	oid, ok := res.InsertedID.(bson.ObjectID)
	if !ok {
		return "", fmt.Errorf("unexpected inserted id type: %T", res.InsertedID)
	}
	return oid.Hex(), nil
}

func (r *AdminRepo) GetPostByID(ctx context.Context, id string) (*document.Post, error) {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid post id: %w", err)
	}
	var post document.Post
	err = r.db.FindOne(ctx, bson.M{"_id": oid}).Decode(&post)
	if err != nil {
		return nil, err
	}
	return &post, nil
}

func (r *AdminRepo) UpdatePostByID(ctx context.Context, id string, update bson.M) error {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return fmt.Errorf("invalid post id: %w", err)
	}
	update["updated_at"] = time.Now().UTC()
	_, err = r.db.UpdateOne(
		ctx,
		bson.M{"_id": oid},
		bson.M{"$set": update},
	)
	return err
}

func (r *AdminRepo) DeletePostByID(ctx context.Context, id string) error {
	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return fmt.Errorf("invalid post id: %w", err)
	}
	_, err = r.db.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}


func (r *AdminRepo) ListPostViewsData(ctx context.Context) ([]dto.PostViewData, error) {
	projection := bson.D{
		{Key: "title", Value: 1},
		{Key: "views", Value: 1},
	}
	opts := options.Find().SetProjection(projection)
	cursor, err := r.db.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	var result []dto.PostViewData
	if err := cursor.All(ctx, &result); err != nil {
		return nil, err
	}
	return result, nil
}
