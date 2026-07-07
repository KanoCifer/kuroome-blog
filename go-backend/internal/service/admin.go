package service

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"

	"app/internal/dto"
	"app/internal/mongo/document"
	"app/internal/repository/postgres"
)

var (
	ErrPostNotFound  = errors.New("blog post not found")
	ErrInvalidPostID = errors.New("invalid post id")
)

type AdminService struct {
	repo  *postgres.AdminRepo
	redis *redis.Client
}

func NewAdminService(repo *postgres.AdminRepo, redis *redis.Client) *AdminService {
	return &AdminService{
		repo:  repo,
		redis: redis,
	}
}

func (s *AdminService) AddPost(post dto.PostIn) (string, error) {
	doc := &document.Post{
		Title:    post.Title,
		Body:     post.Body,
		Tags:     post.Tags,
		IsPinned: boolToInt(post.IsPinned),
	}
	if post.Summary != "" {
		doc.Summary = &post.Summary
	}
	if post.Cover != "" {
		doc.Cover = &post.Cover
	}
	id, err := s.repo.CreatePost(context.Background(), doc)
	if err != nil {
		return "", err
	}
	s.invalidateBlogCache()
	return id, nil
}

func (s *AdminService) UpdatePost(id string, post dto.PostUpdate) error {
	if _, err := bson.ObjectIDFromHex(id); err != nil {
		return ErrInvalidPostID
	}
	_, err := s.repo.GetPostByID(context.Background(), id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return ErrPostNotFound
		}
		return err
	}

	update := bson.M{
		"title":     post.Title,
		"body":      post.Body,
		"summary":   post.Summary,
		"cover":     post.Cover,
		"tags":      post.Tags,
		"is_pinned": boolToInt(post.IsPinned),
	}
	if err := s.repo.UpdatePostByID(context.Background(), id, update); err != nil {
		return err
	}
	s.invalidateBlogCache()
	return nil
}

func (s *AdminService) DeletePost(id string) error {
	if _, err := bson.ObjectIDFromHex(id); err != nil {
		return ErrInvalidPostID
	}
	_, err := s.repo.GetPostByID(context.Background(), id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return ErrPostNotFound
		}
		return err
	}

	if err := s.repo.DeletePostByID(context.Background(), id); err != nil {
		return err
	}
	s.invalidateBlogCache()
	return nil
}

func (s *AdminService) TrackVisitor(data dto.VisitorData) error {
	payload, err := json.Marshal(data)
	if err != nil {
		return err
	}
	ctx := context.Background()
	return s.redis.RPush(ctx, "app:migration_queue", payload).Err()
}

func (s *AdminService) invalidateBlogCache() {
	ctx := context.Background()
	keys := []string{"cache:get_blogs", "cache:get_blog_post", "cache:get_blog"}
	s.redis.Del(ctx, keys...)
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
