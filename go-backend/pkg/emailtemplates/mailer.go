package emailtemplates

import (
	"context"

	"github.com/KanoCifer/kuroome-blog/pkg/notification"
)

// Mailer 把"场景 → Message → 发送"封到一处，避免业务侧重复拼
// emailtemplates.*Email + notification.NotificationContext 这套 boilerplate。
//
// 持有 notification.Channel（接口）而非具体 EmailChannel：
//   - 生产构造（NewMailer）默认注入 EmailChannel；
//   - 测试可注入 fake channel 做断言；
//
// 模板细节（5 个 Scenario）只在本包内可见，调用方只看到
// Mailer.SendXxx(ctx, email, ...) 这种业务语义方法。
type Mailer struct {
	channel notification.Channel
}

// NewMailer 默认构造：邮件渠道走全局 SMTP 配置（cfg.Mail）。
func NewMailer() *Mailer {
	return &Mailer{channel: &notification.EmailChannel{}}
}

// NewMailerWithChannel 注入自定义 channel，主要给测试用。
func NewMailerWithChannel(ch notification.Channel) *Mailer {
	return &Mailer{channel: ch}
}

// SendVerificationCode 注册验证码（mode: blog / nomu，决定 logo + 副标文案）。
func (m *Mailer) SendVerificationCode(ctx context.Context, email, mode, code string) bool {
	return m.channel.Send(ctx, VerificationEmail(code),
		notification.NotificationContext{Email: email})
}

// SendMagicLogin 魔法登录链接（mode: blog / nomu，决定博客版 vs Nomu 版）。
func (m *Mailer) SendMagicLogin(ctx context.Context, email, mode, link string) bool {
	return m.channel.Send(ctx, MagicLoginEmail(link, mode),
		notification.NotificationContext{Email: email})
}

// SendPasswordReset 找回密码验证码（template 已就绪，待业务接线）。
func (m *Mailer) SendPasswordReset(ctx context.Context, email, code string) bool {
	return m.channel.Send(ctx, BuildScenarioEmail(PasswordResetScenario(code)),
		notification.NotificationContext{Email: email})
}

// SendEmailCodeLogin 邮箱验证码登录（template 已就绪，待业务接线）。
func (m *Mailer) SendEmailCodeLogin(ctx context.Context, email, code string) bool {
	return m.channel.Send(ctx, BuildScenarioEmail(EmailCodeLoginScenario(code)),
		notification.NotificationContext{Email: email})
}