package notification

import (
	"context"
	"log/slog"
	"net/mail"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	gomail "github.com/wneessen/go-mail"
)

// EmailChannel 邮件传输 adapter。
//
// 收件邮箱仅来自 ctx.Email（由调用方从 reminder_config 或 Profile 解析后
// 传入）。缺失时直接返回 false，不上查数据库。全局 SMTP 配置
// （MAIL_USERNAME / MAIL_PASSWORD）缺失时同样返回 false。
type EmailChannel struct{}

// NewEmailChannel 构建邮件渠道。
func NewEmailChannel() *EmailChannel { return &EmailChannel{} }

func (c *EmailChannel) Name() string { return "email" }

func (c *EmailChannel) Send(
	ctx context.Context,
	msg Message,
	nc NotificationContext,
) bool {
	cfg := config.Cfg
	if cfg == nil || cfg.Mail.Username == "" || cfg.Mail.Password == "" {
		slog.Warn("[email] mail server not configured")
		return false
	}
	if nc.Email == "" {
		slog.Warn("[email] email address not provided")
		return false
	}

	client, err := newMailClient(cfg)
	if err != nil {
		slog.Error("[email] build client", "err", err)
		return false
	}
	defer client.Close()

	mailMsg := gomail.NewMsg()
	if err := mailMsg.From(formatFrom(cfg)); err != nil {
		slog.Error("[email] set from", "err", err)
		return false
	}
	if err := mailMsg.To(nc.Email); err != nil {
		slog.Error("[email] set to", "err", err)
		return false
	}
	mailMsg.Subject(msg.Title)

	// HTML 优先；为空时退化为转义后的纯文本 body。
	if msg.HTML != "" {
		mailMsg.SetBodyString(gomail.TypeTextHTML, msg.HTML)
	} else {
		mailMsg.SetBodyString(gomail.TypeTextPlain, msg.Body)
	}

	if err := client.DialAndSend(mailMsg); err != nil {
		slog.Error("[email] send", "err", err)
		return false
	}

	slog.Info("[email] notification sent", "to", nc.Email, "title", msg.Title)
	return true
}

// newMailClient 根据全局配置构建 go-mail 客户端。
func newMailClient(cfg *config.Config) (*gomail.Client, error) {
	opts := []gomail.Option{
		gomail.WithSMTPAuth(gomail.SMTPAuthLogin),
		gomail.WithUsername(cfg.Mail.Username),
		gomail.WithPassword(cfg.Mail.Password),
	}
	if cfg.Mail.Port == 465 {
		// 显式 SSL/TLS。
		opts = append(opts,
			gomail.WithPort(cfg.Mail.Port),
			gomail.WithSSL(),
		)
	} else {
		// STARTTLS（默认 587）。
		opts = append(opts,
			gomail.WithPort(cfg.Mail.Port),
			gomail.WithTLSPortPolicy(gomail.TLSOpportunistic),
		)
	}
	return gomail.NewClient(cfg.Mail.Server, opts...)
}

// formatFrom 生成 "Display Name <user@host>" 形式的发件人地址。
func formatFrom(cfg *config.Config) string {
	addr := mail.Address{Name: cfg.Mail.FromName, Address: cfg.Mail.Username}
	return addr.String()
}
