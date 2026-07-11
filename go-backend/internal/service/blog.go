package service

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
	"github.com/KanoCifer/kuroome-blog/internal/repository/mongodb"
)

type BlogService struct {
	repo *mongodb.BlogRepository
}

func NewBlogService(db *mongo.Database) *BlogService {
	return &BlogService{repo: mongodb.NewBlogRepository(db)}
}

// serializePost 将文档转为输出 DTO —— 与 Python _serialize_post 对齐。
// mongo-driver 将 _id(ObjectID) 解码为 ID 字段的十六进制字符串。
func serializePost(p document.Post) dto.PostOut {
	t := func(tm time.Time) string {
		if tm.IsZero() {
			return ""
		}
		return tm.UTC().Format(time.RFC3339)
	}
	return dto.PostOut{
		ID:        p.ID,
		Title:     p.Title,
		Body:      p.Body,
		Summary:   p.Summary,
		Cover:     p.Cover,
		Tags:      p.Tags,
		IsPinned:  p.IsPinned,
		CreatedAt: t(p.CreatedAt),
		UpdatedAt: t(p.UpdatedAt),
	}
}

// serializePosts 批量序列化，nil/空切片统一为空数组。
func serializePosts(posts []document.Post) []dto.PostOut {
	if len(posts) == 0 {
		return []dto.PostOut{}
	}
	out := make([]dto.PostOut, 0, len(posts))
	for _, p := range posts {
		out = append(out, serializePost(p))
	}
	return out
}

func pagination(page, perPage, total int) dto.PaginationOut {
	pages := 0
	if perPage > 0 {
		pages = (total + perPage - 1) / perPage
	}
	prev, next := (*int)(nil), (*int)(nil)
	if page > 1 {
		v := page - 1
		prev = &v
	}
	if page < pages {
		v := page + 1
		next = &v
	}
	return dto.PaginationOut{
		Page:    page,
		PerPage: perPage,
		Total:   total,
		Pages:   pages,
		HasPrev: page > 1,
		HasNext: page < pages,
		PrevNum: prev,
		NextNum: next,
	}
}

// ListPosts 分页列出博客（含标签聚合）—— 与 Python get_blogs 对齐。
func (s *BlogService) ListPosts(page int, search string) (*dto.BlogListOut, error) {
	if page < 1 {
		page = 1
	}
	const perPage = 10

	posts, total, err := s.repo.ListPosts(context.Background(), page, perPage, search)
	if err != nil {
		slog.Error("list posts", "error", err)
		return nil, err
	}

	tags, err := s.repo.AggregateTagCounts(context.Background())
	if err != nil {
		slog.Error("aggregate tag counts", "error", err)
		return nil, err
	}

	return &dto.BlogListOut{
		Posts:      serializePosts(posts),
		Tags:       tags,
		Pagination: pagination(page, perPage, int(total)),
	}, nil
}

// GetPost 按 ID 获取单篇博客 —— 与 Python get_blog_post 对齐。
func (s *BlogService) GetPost(id string) (*dto.PostOut, error) {
	if id == "" {
		return nil, errs.ErrInvalidPostID
	}
	if _, err := bson.ObjectIDFromHex(id); err != nil {
		return nil, errs.ErrInvalidPostID
	}

	post, err := s.repo.GetPostByID(context.Background(), id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errs.ErrPostNotFound
		}
		slog.Error("get post by id", "error", err, "id", id)
		return nil, err
	}
	out := serializePost(*post)
	return &out, nil
}

// ListTags 列出所有标签及文章数 —— 与 Python list_tags 对齐。
func (s *BlogService) ListTags() ([]dto.TagOut, error) {
	tags, err := s.repo.AggregateTagCounts(context.Background())
	if err != nil {
		slog.Error("aggregate tag counts", "error", err)
		return nil, err
	}
	return tags, nil
}

// ListPostsByTag 按标签分页列出博客 —— 与 Python get_posts_by_tag 对齐。
func (s *BlogService) ListPostsByTag(tag string, page, perPage int) (*dto.PostsByTagOut, error) {
	tag = strings.TrimSpace(tag)
	if tag == "" {
		return nil, errs.ErrInvalidPostID
	}
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 10
	}

	posts, total, err := s.repo.ListPostsByTag(context.Background(), tag, page, perPage)
	if err != nil {
		slog.Error("list posts by tag", "error", err, "tag", tag)
		return nil, err
	}

	return &dto.PostsByTagOut{
		Posts: serializePosts(posts),
		Tag:   tag,
		Total: int(total),
	}, nil
}
