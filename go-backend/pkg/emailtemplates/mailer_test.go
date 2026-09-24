package emailtemplates

import (
	"context"
	"testing"

	"github.com/KanoCifer/kuroome-blog/internal/infra/eventbus"
	"github.com/KanoCifer/kuroome-blog/pkg/notification"
)

type recordingChannel struct {
	calls int
	email string
}

func (c *recordingChannel) Name() string { return "recording" }

func (c *recordingChannel) Send(_ context.Context, _ notification.Message, nc notification.NotificationContext) bool {
	c.calls++
	c.email = nc.Email
	return true
}

func TestMailerRoutesThroughEventBus(t *testing.T) {
	bus := eventbus.NewEventBus()
	channel := &recordingChannel{}
	mailer := NewMailerWithChannel(channel)
	mailer.RegisterEventBus(bus)

	if !mailer.SendVerificationCode(context.Background(), "reader@example.com", "blog", "123456") {
		t.Fatal("SendVerificationCode should accept the event")
	}
	bus.Wait()

	if channel.calls != 1 {
		t.Fatalf("channel calls = %d, want 1", channel.calls)
	}
	if channel.email != "reader@example.com" {
		t.Fatalf("recipient = %q, want reader@example.com", channel.email)
	}
}
