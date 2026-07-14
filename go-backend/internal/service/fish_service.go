package service

import (
	"context"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
)

type FishRepoer interface {
	List(ctx context.Context) ([]*document.FishingSpot, error)
	Create(ctx context.Context, spot *document.FishingSpot) error
	Update(ctx context.Context, spot *document.FishingSpot) error
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
