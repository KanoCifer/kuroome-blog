package visitor

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/model"
)

type repositoryStub struct {
	track *model.VisitorTrack
	err   error
}

func (r *repositoryStub) Insert(_ context.Context, track *model.VisitorTrack) error {
	r.track = track
	return r.err
}

func TestTracker_TrackVisitor_MapsRequest(t *testing.T) {
	repo := &repositoryStub{}
	tracker := NewTracker(repo)
	data := dto.VisitorTrackRequest{
		VisitorID:        "visitor-1",
		PageURL:          "https://example.com/post",
		PagePath:         "/post",
		Referrer:         "https://example.com/",
		Browser:          "Chrome",
		ScreenResolution: "1920x1080",
		Language:         "zh-CN",
		BrowserVersion:   "120",
		BrowserName:      "Chrome",
		OSName:           "macOS",
		OSVersion:        "15",
		DeviceType:       "desktop",
		Cpu:              "arm64",
		IpAddress:        "127.0.0.1",
	}

	if err := tracker.TrackVisitor(context.Background(), data); err != nil {
		t.Fatalf("TrackVisitor: %v", err)
	}
	want := &model.VisitorTrack{
		VisitorID:        data.VisitorID,
		PageURL:          data.PageURL,
		PagePath:         data.PagePath,
		Referrer:         &data.Referrer,
		Browser:          &data.Browser,
		ScreenResolution: &data.ScreenResolution,
		Language:         &data.Language,
		IPAddress:        data.IpAddress,
		BrowserName:      &data.BrowserName,
		BrowserVersion:   &data.BrowserVersion,
		OSName:           &data.OSName,
		OSVersion:        &data.OSVersion,
		CPU:              &data.Cpu,
		DeviceType:       &data.DeviceType,
	}
	if !reflect.DeepEqual(repo.track, want) {
		t.Errorf("track = %+v, want %+v", repo.track, want)
	}
}

func TestTracker_TrackVisitor_EmptyOptionalFieldsAndError(t *testing.T) {
	wantErr := errors.New("insert failed")
	repo := &repositoryStub{err: wantErr}
	tracker := NewTracker(repo)

	if err := tracker.TrackVisitor(context.Background(), dto.VisitorTrackRequest{}); !errors.Is(err, wantErr) {
		t.Fatalf("err = %v, want %v", err, wantErr)
	}
	if repo.track.Referrer != nil || repo.track.Browser != nil || repo.track.ScreenResolution != nil ||
		repo.track.Language != nil || repo.track.BrowserName != nil || repo.track.BrowserVersion != nil ||
		repo.track.OSName != nil || repo.track.OSVersion != nil || repo.track.CPU != nil || repo.track.DeviceType != nil {
		t.Errorf("empty optional fields must map to nil: %+v", repo.track)
	}
}
