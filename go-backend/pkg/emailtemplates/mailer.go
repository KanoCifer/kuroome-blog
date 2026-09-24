package emailtemplates

import (
	"context"
	"log/slog"

	"github.com/KanoCifer/kuroome-blog/internal/infra/eventbus"
	"github.com/KanoCifer/kuroome-blog/pkg/notification"
)

const (
	// EmailEventTopic is the single process-local event topic for outbound mail.
	EmailEventTopic = "email.send"

	EmailVerificationCode = "verification_code"
	EmailMagicLogin       = "magic_login"
	EmailPasswordReset    = "password_reset"
	EmailCodeLogin        = "email_code_login"
)

type EmailEvent struct {
	Type  string
	Email string
	Mode  string
	Code  string
	Link  string
}

// Mailer is the business-facing mail publisher. The concrete SMTP/template
// delivery is kept behind the event handler, so callers do not need to know
// which channel performs the send.
type Mailer struct {
	channel notification.Channel
	bus     eventbus.Bus
}

func NewMailer() *Mailer {
	return &Mailer{channel: &notification.EmailChannel{}}
}

// NewMailerWithChannel remains useful for unit tests and for callers that
// intentionally use the legacy synchronous transport.
func NewMailerWithChannel(ch notification.Channel) *Mailer {
	return &Mailer{channel: ch}
}

// RegisterEventBus switches this mailer to event-driven delivery.
func (m *Mailer) RegisterEventBus(bus eventbus.Bus) {
	m.bus = bus
	if bus == nil {
		return
	}
	bus.On(EmailEventTopic, m.handleEmailEvent)
}

func (m *Mailer) emit(ctx context.Context, event EmailEvent) bool {
	if m.bus != nil {
		return m.bus.Emit(ctx, EmailEventTopic, event)
	}
	return m.deliver(ctx, event)
}

func (m *Mailer) handleEmailEvent(ctx context.Context, _ string, data any) {
	event, ok := data.(EmailEvent)
	if !ok {
		slog.ErrorContext(ctx, "invalid email event payload", "type", "%T", data)
		return
	}
	if !m.deliver(ctx, event) {
		slog.ErrorContext(ctx, "email event delivery failed", "type", event.Type, "email", event.Email)
	}
}

func (m *Mailer) deliver(ctx context.Context, event EmailEvent) bool {
	if m.channel == nil {
		return false
	}
	var message notification.Message
	switch event.Type {
	case EmailVerificationCode:
		message = VerificationEmail(event.Code)
	case EmailMagicLogin:
		message = MagicLoginEmail(event.Link, event.Mode)
	case EmailPasswordReset:
		message = PasswordResetEmail(event.Code, event.Mode)
	case EmailCodeLogin:
		message = BuildScenarioEmail(EmailCodeLoginScenario(event.Code))
	default:
		return false
	}
	return m.channel.Send(ctx, message, notification.NotificationContext{Email: event.Email})
}

func (m *Mailer) SendVerificationCode(ctx context.Context, email, mode, code string) bool {
	return m.emit(ctx, EmailEvent{Type: EmailVerificationCode, Email: email, Mode: mode, Code: code})
}

func (m *Mailer) SendMagicLogin(ctx context.Context, email, mode, link string) bool {
	return m.emit(ctx, EmailEvent{Type: EmailMagicLogin, Email: email, Mode: mode, Link: link})
}

func (m *Mailer) SendPasswordResetCode(ctx context.Context, email, mode, code string) bool {
	return m.emit(ctx, EmailEvent{Type: EmailPasswordReset, Email: email, Mode: mode, Code: code})
}

func (m *Mailer) SendEmailCodeLogin(ctx context.Context, email, code string) bool {
	return m.emit(ctx, EmailEvent{Type: EmailCodeLogin, Email: email, Code: code})
}
