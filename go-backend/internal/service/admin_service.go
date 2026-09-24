package service

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"

	blogerrs "github.com/KanoCifer/kuroome-blog/internal/domain/blog/errs"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
)

// AdminRepositoryer 定义 admin 后台对 posts 集合的读写契约。
type AdminRepositoryer interface {
	CreatePost(ctx context.Context, post *document.Post) (string, error)
	GetPostByID(ctx context.Context, id string) (*document.Post, error)
	UpdatePostByID(ctx context.Context, id string, update bson.M) error
	DeletePostByID(ctx context.Context, id string) error
	ListPostViewsData(ctx context.Context) ([]document.PostViewData, error)
}

type AdminService struct {
	repo  AdminRepositoryer
	redis *redis.Client
}

func NewAdminService(repo AdminRepositoryer, redis *redis.Client) *AdminService {
	return &AdminService{repo: repo, redis: redis}
}

func (s *AdminService) AddPost(ctx context.Context, post dto.PostRequest) (string, error) {
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
	id, err := s.repo.CreatePost(ctx, doc)
	if err != nil {
		return "", err
	}
	s.invalidateBlogCache(ctx)
	slog.InfoContext(ctx, "post created", "post_id", id, "title", doc.Title)
	return id, nil
}

// UpdatePost 部分更新文章 —— 与 DevTaskService.Update / FishService.UpdateFishingSpot 同模式：
// 只把前端实际传了的字段塞进 bson.M，避免未传字段被静默覆盖为零值。
// updated_at 由 service 层刷新（不再由 repo 负责），与项目其它 update 路径对齐。
func (s *AdminService) UpdatePost(ctx context.Context, id string, post dto.PostUpdate) error {
	if _, err := bson.ObjectIDFromHex(id); err != nil {
		return blogerrs.ErrInvalidPostID
	}
	_, err := s.repo.GetPostByID(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return blogerrs.ErrPostNotFound
		}
		return err
	}

	update := bson.M{}
	if post.Title != nil {
		update["title"] = *post.Title
	}
	if post.Body != nil {
		update["body"] = *post.Body
	}
	if post.Summary != nil {
		update["summary"] = *post.Summary
	}
	if post.Cover != nil {
		update["cover"] = *post.Cover
	}
	if post.Tags != nil {
		update["tags"] = *post.Tags
	}
	if post.IsPinned != nil {
		update["is_pinned"] = boolToInt(*post.IsPinned)
	}
	if len(update) == 0 {
		return nil
	}
	update["updated_at"] = time.Now().UTC()

	if err := s.repo.UpdatePostByID(ctx, id, update); err != nil {
		return err
	}
	s.invalidateBlogCache(ctx)
	slog.InfoContext(ctx, "post updated", "post_id", id)
	return nil
}

func (s *AdminService) DeletePost(ctx context.Context, id string) error {
	if _, err := bson.ObjectIDFromHex(id); err != nil {
		return blogerrs.ErrInvalidPostID
	}
	_, err := s.repo.GetPostByID(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return blogerrs.ErrPostNotFound
		}
		return err
	}

	if err := s.repo.DeletePostByID(ctx, id); err != nil {
		return err
	}
	s.invalidateBlogCache(ctx)
	slog.InfoContext(ctx, "post deleted", "post_id", id)
	return nil
}

func (s *AdminService) ListPostViewsData(ctx context.Context) ([]dto.PostViewResponse, error) {
	docs, err := s.repo.ListPostViewsData(ctx)
	if err != nil {
		return nil, err
	}
	data := make([]dto.PostViewResponse, 0, len(docs))
	for _, d := range docs {
		data = append(data, dto.PostViewResponse{Title: d.Title, Views: d.Views})
	}
	return data, nil
}

func (s *AdminService) invalidateBlogCache(ctx context.Context) {
	if s.redis == nil {
		return
	}
	keys := []string{"cache:get_blogs", "cache:get_blog_post", "cache:get_blog"}
	s.redis.Del(ctx, keys...)
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
