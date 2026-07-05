package document

import "time"

type SubscriptionLog struct {
	ID            string    `bson:"_id,omitempty"`
	SubID         int       `bson:"sub_id"`
	UserID        int       `bson:"user_id"`
	ReminderType  string    `bson:"reminder_type"`
	ChannelsSent  []string  `bson:"channels_sent"`
	SentAt        time.Time `bson:"sent_at"`
	Status        string    `bson:"status"`
	ErrorMessage  *string   `bson:"error_message"`
}
