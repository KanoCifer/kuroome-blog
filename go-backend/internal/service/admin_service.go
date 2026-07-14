package service

import (
	"context"
	"errors"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
)

type AdminService struct {
	repo    *postgres.AdminRepo
	visitor *postgres.VisitorRepo
	redis   *redis.Client
}

func NewAdminService(
	repo *postgres.AdminRepo,
	visitor *postgres.VisitorRepo,
	redis *redis.Client,
) *AdminService {
	return &AdminService{
		repo:    repo,
		visitor: visitor,
		redis:   redis,
	}
}

// ptrIf 在字符串非空时返回其指针，否则返回 nil。
// 用于把前端上报的空字符串正确入库为 NULL（schema 已改为 nullable），
// 与 parse-ua 脚本下线后"字段缺失即无意义"的语义对齐。
func ptrIf(s string) *string {
	if s != "" {
		return &s
	}
	return nil
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
		return errs.ErrInvalidPostID
	}
	_, err := s.repo.GetPostByID(context.Background(), id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return errs.ErrPostNotFound
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
		return errs.ErrInvalidPostID
	}
	_, err := s.repo.GetPostByID(context.Background(), id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return errs.ErrPostNotFound
		}
		return err
	}

	if err := s.repo.DeletePostByID(context.Background(), id); err != nil {
		return err
	}
	s.invalidateBlogCache()
	return nil
}


func (s *AdminService) ListPostViewsData() ([]dto.PostViewData, error) {
	data, err := s.repo.ListPostViewsData(context.Background())
	if err != nil {
		return nil, err
	}
	return data, nil
}


// TrackVisitor 把一次访问同步写入 PostgreSQL。
//
// 历史：前端曾经经 Redis app:migration_queue 缓冲，再由 Python taskiq
// 定时任务消费落库——那条链路久经失败（缺显式 commit、browser 列约束、
// DTO 与 schema 不对齐），所以此处改为 Go 端直写，不再依赖 Redis 跨语言消费。
// visit_time 不使用前端传的值，由 PG default current_timestamp 填充。
func (s *AdminService) TrackVisitor(data dto.VisitorData) error {
	track := &model.VisitorTrack{
		VisitorID:        data.VisitorID,
		PageURL:          data.PageURL,
		PagePath:         data.PagePath,
		Referrer:         ptrIf(data.Referrer),
		Browser:          ptrIf(data.Browser),
		ScreenResolution: ptrIf(data.ScreenResolution),
		Language:         ptrIf(data.Language),
		IPAddress:        data.IpAddress,
		BrowserName:      ptrIf(data.BrowserName),
		BrowserVersion:   ptrIf(data.BrowserVersion),
		OSName:           ptrIf(data.OSName),
		OSVersion:        ptrIf(data.OSVersion),
		CPU:              ptrIf(data.Cpu),
		DeviceType:       ptrIf(data.DeviceType),
	}
	return s.visitor.Insert(context.Background(), track)
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
