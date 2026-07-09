package document

import "time"

type MomentVisibility string

const (
	MomentPublic   MomentVisibility = "PUBLIC"
	MomentPrivate  MomentVisibility = "PRIVATE"
	MomentUnlisted MomentVisibility = "UNLISTED"
)

type MomentStatus string

const (
	MomentPublished MomentStatus = "PUBLISHED"
	MomentDraft     MomentStatus = "DRAFT"
	MomentArchived  MomentStatus = "ARCHIVED"
)

type MomentAttachmentType string

const (
	MomentAttachmentImage MomentAttachmentType = "IMAGE"
	MomentAttachmentLink  MomentAttachmentType = "LINK"
	MomentAttachmentBook  MomentAttachmentType = "BOOK"
	MomentAttachmentQuote MomentAttachmentType = "QUOTE"
)

type MomentAttachment struct {
	Type         MomentAttachmentType `bson:"type"`
	URL          string               `bson:"url"`
	ThumbnailURL *string              `bson:"thumbnail_url"`
	Title        *string              `bson:"title"`
	Description  *string              `bson:"description"`
	Meta         map[string]any       `bson:"meta"`
}

type MomentLocation struct {
	Name      *string  `bson:"name"`
	Latitude  *float64 `bson:"latitude"`
	Longitude *float64 `bson:"longitude"`
}

type Moment struct {
	ID           string             `bson:"_id,omitempty"`
	UserID       int                `bson:"user_id"`
	Content      string             `bson:"content"`
	Summary      *string            `bson:"summary"`
	Visibility   MomentVisibility   `bson:"visibility"`
	Status       MomentStatus       `bson:"status"`
	Mood         *string            `bson:"mood"`
	Tags         []string           `bson:"tags"`
	Attachments  []MomentAttachment `bson:"attachments"`
	Location     *MomentLocation    `bson:"location"`
	Source       *string            `bson:"source"`
	IsPinned     bool               `bson:"is_pinned"`
	AllowComment bool               `bson:"allow_comment"`
	LikeCount    int                `bson:"like_count"`
	CommentCount int                `bson:"comment_count"`
	ViewCount    int                `bson:"view_count"`
	PublishedAt  *time.Time         `bson:"published_at"`
	CreatedAt    time.Time          `bson:"created_at"`
	UpdatedAt    time.Time          `bson:"updated_at"`
	DeletedAt    *time.Time         `bson:"deleted_at"`
}
