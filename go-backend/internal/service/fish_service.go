package service

import (
	"context"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type FishRepoer interface {
	List(ctx context.Context) ([]*document.FishingSpot, error)
	Create(ctx context.Context, spot *document.FishingSpot) error
	Update(ctx context.Context, id string, data bson.M) error
	Delete(ctx context.Context, id string, hardDelete ...bool) error
	GetByID(ctx context.Context, id string) (*document.FishingSpot, error)
}

type Fisher interface {
	GetFishingSpots(ctx context.Context) ([]*dto.FishingSpotOut, error)
	GetFishingSpotByID(ctx context.Context, id string) (*dto.FishingSpotOut, error)
}

type FishService struct {
	repo FishRepoer
}

func NewFishService(repo FishRepoer) *FishService {
	return &FishService{repo: repo}
}

func (s *FishService) GetFishingSpots(ctx context.Context) ([]*dto.FishingSpotOut, error) {
	docs, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}
	var spots []*dto.FishingSpotOut
	for _, doc := range docs {
		spots = append(spots, &dto.FishingSpotOut{
			ID:          doc.ID,
			Name:        doc.Name,
			Description: doc.Description,
			Location:    doc.Location,
			Tags:        doc.Tags,
			Rating:      doc.Rating,
			Images:      doc.Images,
		})
	}
	return spots, nil
}

func (s *FishService) GetFishingSpotByID(ctx context.Context, id string) (*dto.FishingSpotOut, error) {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	var out = &dto.FishingSpotOut{
		ID:          doc.ID,
		Name:        doc.Name,
		Description: doc.Description,
		Location:    doc.Location,
		Tags:        doc.Tags,
		Rating:      doc.Rating,
		Images:      doc.Images,
	}

	return out, nil
}

// UpdateFishingSpot 部分更新钓点 —— 与 DevTaskService.Update 同模式：
// 只把前端实际传了的字段塞进 bson.M，避免未传字段被静默覆盖为零值。
// updated_at 由 service 层刷新，repo 只负责执行。
func (s *FishService) UpdateFishingSpot(ctx context.Context, id string, spot *dto.FishingSpotUpdate) error {
	data := bson.M{}
	if spot.Name != nil {
		data["name"] = *spot.Name
	}
	if spot.Description != nil {
		data["description"] = *spot.Description
	}
	if spot.Location != nil {
		data["location"] = *spot.Location
	}
	if spot.Tags != nil {
		data["tags"] = *spot.Tags
	}
	if spot.Rating != nil {
		data["rating"] = *spot.Rating
	}
	if spot.Images != nil {
		data["images"] = *spot.Images
	}
	if len(data) == 0 {
		return nil
	}
	data["updated_at"] = time.Now().UTC()
	return s.repo.Update(ctx, id, data)
}
