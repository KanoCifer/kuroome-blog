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

	// List-Unsubscribe（RFC 2369）。Gmail/Outlook 据此在邮件上方出"退订"按钮，
	// 是触发类邮件进入 Inbox（而非 Promotions/Spam）的关键 header。
	// 当前邮件为 system/trigger（验证码、magic link），仅用 RFC 2369 mailto:
	// 即可；one-click（RFC 8058）需要在后端提供 HTTPS endpoint 后续再升级。
	if uri := unsubscribeURI(cfg); uri != "" {
		mailMsg.SetListUnsubscribe(uri)
	}

	// HTML + 纯文本双版本：HTML 为主，纯文本作 fallback，兼容所有客户端。
	if msg.HTML != "" {
		mailMsg.SetBodyString(gomail.TypeTextPlain, msg.Body)
		mailMsg.AddAlternativeString(gomail.TypeTextHTML, msg.HTML)
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

// formatFrom 生成 "Display Name <addr>" 形式的发件人地址。
//
// 优先用 cfg.Mail.FromAddress，缺省回退到 cfg.Mail.Username ——
// 兼容 QQ / Gmail 这种 "Username==发件邮箱" 的服务，
// 同时支持 Resend 这种 "Username=resend（固定）、FromAddress=已验证域邮箱"的拆分。
func formatFrom(cfg *config.Config) string {
	addr := cfg.Mail.FromAddress
	if addr == "" {
		addr = cfg.Mail.Username
	}
	return (&mail.Address{Name: cfg.Mail.FromName, Address: addr}).String()
}

// unsubscribeURI 返回 RFC 2369 List-Unsubscribe header 应写入的 URI。
//
// 仅在 cfg.Mail.UnsubscribeMailto 显式配置时返回非空；缺省时返回空字符串，
// 调用方据此跳过 SetListUnsubscribe，避免发出无效的退订路径（一个 5xx
// 的退订端点反而会拖累 sender reputation，比不加更糟）。
//
// 返回值形如 "mailto:unsubscribe@kanocifer.chat"；gomail v0.8+ 的
// SetListUnsubscribe 会按 RFC 2369 自动加尖括号，不需要手动包。
func unsubscribeURI(cfg *config.Config) string {
	if cfg == nil || cfg.Mail.UnsubscribeMailto == "" {
		return ""
	}
	return "mailto:" + cfg.Mail.UnsubscribeMailto
}
