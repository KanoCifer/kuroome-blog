package syncbus

import (
	"encoding/json"
	"errors"
	"time"
)

// DuplicateSnapshotService 是「复制任务快照跨设备同步」服务名。
const DuplicateSnapshotService = "duplicate_snapshot"

// DuplicateSnapshotPayload 是复制快照同步的 payload。
// productDraft / publicationInput 保持原始 JSON 透传：这两份草稿由扩展端
// buildProductDraft / buildPublicationInput 生成，服务端不解释其内部字段，
// 只保证顶层信封可路由（对齐 nomu config sync 的 config_data 透传语义）。
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
