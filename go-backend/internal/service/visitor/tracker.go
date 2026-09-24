package visitor

import (
	"context"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// Repository 定义访客追踪记录的写入契约。
type Repository interface {
	Insert(ctx context.Context, track *model.VisitorTrack) error
}

// Tracker 负责把访客追踪请求映射为持久化模型并写入 repository。
type Tracker struct {
	repo Repository
}

func NewTracker(repo Repository) *Tracker {
	return &Tracker{repo: repo}
}

func (t *Tracker) TrackVisitor(ctx context.Context, data dto.VisitorTrackRequest) error {
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
	return t.repo.Insert(ctx, track)
}

func ptrIf(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
