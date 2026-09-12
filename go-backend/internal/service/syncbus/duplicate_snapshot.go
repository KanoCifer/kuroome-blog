package syncbus

import (
	"encoding/json"
	"errors"
	"time"
)

const DuplicateSnapshotService = "duplicate_snapshot"

type DuplicateSnapshotPayload struct {
	SourceSku        string          `json:"sourceSku"`
	CapturedAt       int64           `json:"capturedAt"`
	ExpiresAt        int64           `json:"expiresAt"`
	FromCountry      string          `json:"fromCountry,omitempty"`
	FromPartnerCode  string          `json:"fromPartnerCode,omitempty"`
	ProductDraft     json.RawMessage `json:"productDraft"`
	PublicationInput json.RawMessage `json:"publicationInput"`
}

// DuplicateSnapshotHandler 实现 Handler。
type DuplicateSnapshotHandler struct{}

func (DuplicateSnapshotHandler) Service() string { return DuplicateSnapshotService }

func (DuplicateSnapshotHandler) Validate(payload json.RawMessage) error {
	var p DuplicateSnapshotPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return errors.New("syncbus: invalid duplicate snapshot payload")
	}
	if p.SourceSku == "" {
		return errors.New("syncbus: sourceSku is required")
	}
	if len(p.ProductDraft) == 0 || len(p.PublicationInput) == 0 {
		return errors.New("syncbus: productDraft and publicationInput are required")
	}
	if p.ExpiresAt > 0 && time.Now().Unix() > p.ExpiresAt {
		return ErrExpired
	}
	return nil
}
