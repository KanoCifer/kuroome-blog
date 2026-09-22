// Package emailtemplates 集中 user service 的全部邮件（Pillow 设计）。
//
// 五种场景共享同一个 Pillow HTML 容器：22px 圆角大卡 + 居中 logo header +
// 居中布局 + 品牌页脚。差异在两处：
//   - Action：验证码 pill（ActionCode）或 #007AFF CTA 按钮（ActionButton）
//   - Scenario 文案字段（Heading / Description / Brand / FooterBy …）
//
// 场景清单（Kind）：
//   - KindRegister        注册验证码
//   - KindPasswordReset   找回密码
//   - KindEmailCodeLogin  邮箱验证码登录
//   - KindMagicLoginBlog  魔法登录 · 博客版
//   - KindMagicLoginNomu  魔法登录 · Nomu 版
//
// 加一类邮件 = 加一个 Scenario 字面量 + 一组预填常量，HTML 模板本身不动。
package emailtemplates

import (
	"fmt"
	"html"

	"github.com/KanoCifer/kuroome-blog/pkg/notification"
)

// Kind 区分邮件的真实用途 —— 用于测试断言 / 后续路由 / 防误用。
type Kind string

const (
	KindRegister       Kind = "register"
	KindPasswordReset  Kind = "password_reset"
	KindEmailCodeLogin Kind = "email_code_login"
	KindMagicLoginBlog Kind = "magic_login_blog"
	KindMagicLoginNomu Kind = "magic_login_nomu"
)

// ActionKind 描述 Pillow 容器的主交互元素 —— Pillow 模板里据此切换
// 渲染 #F5F5F7 验证码 pill 或 #007AFF CTA 按钮。
type ActionKind string

const (
	ActionCode   ActionKind = "code"   // 居中等宽验证码 pill
	ActionButton ActionKind = "button" // #007AFF 圆角 CTA 按钮 + fallback 链接
)

// Action 是 Scenario 的主元素；构造时由调用方负责 escape Label / URL。
type Action struct {
	Kind  ActionKind
	Label string // 验证码值 / 按钮文字
	URL   string // 仅 ActionButton 时使用；其他场景留空
}

// mode 常量与 internal/service/user_service.go 复用同一字符串字面量；
// 这里独立声明，避免反向依赖 internal 包。
const (
	modeBlog = "blog"
	modeNomu = "nomu"
)

// NomuLogoURL 是 nomu 邮件模板品牌头部的 logo 地址；test 用此常量做包含断言。
// Nomu 有自己的落地页站点（nomu.kanocifer.chat），logo 从它自己的 icon 取。
const NomuLogoURL = "https://nomu.kanocifer.chat/icon/128.png"
const BlogLogoURL = "https://cdn.kanocifer.chat/images/logo.png"

// Scenario 描述一个 Pillow 邮件的全部可变量。
//
// Pillow 容器对所有场景一致（圆角大卡 + 居中 logo header + 居中布局 + 品牌页脚）；
// Action + 文本字段决定渲染什么。所有字符串由调用方负责 HTML escape
// （Pillow 模板里不再重复 escape）。
type Scenario struct {
	Kind         Kind
	Title        string // 邮件主题 / <title>
	LogoURL      string // header logo src
	Brand        string // logo 下方粗体字（"Nomu" / "kanocifer.chat"）
	Subtitle     string // brand 下方小字
	Heading      string // H1
	Description  string // H1 下方说明
	Action       Action
	Expiry       string // 有效期 / 链接有效期
	SecurityNote string // 安全提示
	FooterBy     string // 代发主语；空时跳过"代发"行，只渲染 FooterLine
	FooterLine   string // 页脚次行（单行页脚时也用这个）
}

// ---------- 注册验证码 ----------

func RegisterScenario(code string) Scenario {
	return Scenario{
		Kind:         KindRegister,
		Title:        "Nomu 注册验证码",
		LogoURL:      NomuLogoURL,
		Brand:        "Nomu",
		Subtitle:     "Chrome 扩展 · 邮箱验证",
		Heading:      "这是您的验证码",
		Description:  "用于完成 Nomu 账号注册，请妥善保管。",
		Action:       Action{Kind: ActionCode, Label: html.EscapeString(code)},
		Expiry:       "请在 5 分钟内使用。",
		SecurityNote: "验证码仅用于本次注册，不会以任何形式再次索取。若非本人操作，请忽略此邮件。",
		FooterBy:     "kanocifer.chat",
		FooterLine:   "Nomu · 注册验证码",
	}
}

// ---------- 找回密码（流程接入即可用）----------

func PasswordResetScenario(code string) Scenario {
	return Scenario{
		Kind:         KindPasswordReset,
		Title:        "Nomu 找回密码",
		LogoURL:      NomuLogoURL,
		Brand:        "Nomu",
		Subtitle:     "Chrome 扩展 · 找回密码",
		Heading:      "重置您的密码",
		Description:  "使用以下验证码重置 Nomu 账号密码。",
		Action:       Action{Kind: ActionCode, Label: html.EscapeString(code)},
		Expiry:       "请在 10 分钟内使用。",
		SecurityNote: "验证码仅用于本次重置，不会以任何形式再次索取。若非本人操作，请忽略此邮件。",
		FooterBy:     "kanocifer.chat",
		FooterLine:   "Nomu · 找回密码",
	}
}

// ---------- 邮箱验证码登录（流程接入即可用）----------

func EmailCodeLoginScenario(code string) Scenario {
	return Scenario{
		Kind:         KindEmailCodeLogin,
		Title:        "Nomu 登录验证码",
		LogoURL:      NomuLogoURL,
		Brand:        "Nomu",
		Subtitle:     "Chrome 扩展 · 邮箱登录",
		Heading:      "您的登录验证码",
		Description:  "使用以下验证码登录 Nomu 账号。",
		Action:       Action{Kind: ActionCode, Label: html.EscapeString(code)},
		Expiry:       "请在 5 分钟内使用。",
		SecurityNote: "验证码仅用于本次登录，不会以任何形式再次索取。若非本人操作，请忽略此邮件。",
		FooterBy:     "kanocifer.chat",
		FooterLine:   "Nomu · 邮箱登录",
	}
}

// ---------- 魔法登录 · 博客版 ----------

func MagicLoginBlogScenario(link string) Scenario {
	return Scenario{
		Kind:         KindMagicLoginBlog,
		Title:        "kanocifer.chat 登录链接",
		LogoURL:      BlogLogoURL,
		Brand:        "kanocifer.chat",
		Subtitle:     "魔法登录",
		Heading:      "点击下方按钮登录",
		Description:  "无需输入密码，单击按钮即可登录您的账号。",
		Action:       Action{Kind: ActionButton, Label: "登录 kanocifer.chat", URL: html.EscapeString(link)},
		Expiry:       "链接 10 分钟内有效，仅可使用一次。",
		SecurityNote: "若非本人操作，请忽略此邮件。",
		FooterBy:     "", // 自营产品，跳过"代发"行
		FooterLine:   "kanocifer.chat · 魔法登录",
	}
}

// ---------- 魔法登录 · Nomu 版 ----------

func MagicLoginNomuScenario(link string) Scenario {
	return Scenario{
		Kind:         KindMagicLoginNomu,
		Title:        "Nomu 登录链接",
		LogoURL:      NomuLogoURL,
		Brand:        "Nomu",
		Subtitle:     "Chrome 扩展 · 一键登录",
		Heading:      "点击下方按钮完成登录",
		Description:  "点击后会自动打开 Nomu 并完成登录。",
		Action:       Action{Kind: ActionButton, Label: "完成 Nomu 登录", URL: html.EscapeString(link)},
		Expiry:       "链接 10 分钟内有效，仅可使用一次。",
		SecurityNote: "若非本人操作，请忽略此邮件。",
		FooterBy:     "kanocifer.chat",
		FooterLine:   "Nomu · 魔法登录",
	}
}

// ---------- Builder ----------

// VerificationEmail 构造注册验证码邮件（含 Title / Body / HTML）。
//
// 注册场景的快捷封装；调用方无需关心 Scenario 概念。
func VerificationEmail(code string) notification.Message {
	return BuildScenarioEmail(RegisterScenario(code))
}

// RenderVerificationHTML 渲染注册验证码 HTML。注册场景的快捷封装。
func RenderVerificationHTML(code string) string {
	return RenderScenarioHTML(RegisterScenario(code))
}

// MagicLoginEmail 构造魔法登录邮件，按 mode 选 blog/nomu 场景。
//
// magic_login_blog → BlogLogoURL + kanocifer 品牌；
// magic_login_nomu → NomuLogoURL + Nomu 品牌；两者共享 Pillow 容器 + 蓝色 CTA。
func MagicLoginEmail(link, mode string) notification.Message {
	return BuildScenarioEmail(magicLoginScenario(link, mode))
}

// RenderMagicLoginHTML 渲染魔法登录邮件 HTML。兼容老 API。
func RenderMagicLoginHTML(link, mode string) string {
	return RenderScenarioHTML(magicLoginScenario(link, mode))
}

func magicLoginScenario(link, mode string) Scenario {
	if mode == modeNomu {
		return MagicLoginNomuScenario(link)
	}
	return MagicLoginBlogScenario(link)
}

// BuildScenarioEmail 把任意 Scenario 包成 notification.Message。
//
// Body 是纯文本 fallback：标题 + 主元素值 + 有效期，
// 兼容屏蔽 HTML 的客户端（安全网关 / 纯文本 mail 客户端）。
func BuildScenarioEmail(s Scenario) notification.Message {
	var plain string
	switch s.Action.Kind {
	case ActionButton:
		plain = fmt.Sprintf("%s\n%s\n%s\n%s", s.Title, s.Action.URL, s.Expiry, s.SecurityNote)
	default:
		plain = fmt.Sprintf("%s\n您的验证码：%s\n%s", s.Title, s.Action.Label, s.Expiry)
	}
	return notification.Message{
		Title: s.Title,
		Body:  plain,
		HTML:  RenderScenarioHTML(s),
	}
}

// RenderScenarioHTML 用 Pillow 模板渲染任意 Scenario。
//
// Pillow 设计：22px 圆角大卡 + 居中 logo header + 柔和阴影 +
// 居中布局 + 品牌页脚。模板自身不含业务字眼（除品牌层常量 "Nomu" 与
// "kanocifer.chat"）；加新场景只换 Scenario。
func RenderScenarioHTML(s Scenario) string {
	var actionHTML string
	switch s.Action.Kind {
	case ActionButton:
		actionHTML = fmt.Sprintf(pillowButtonAction, s.Action.Label, s.Action.URL)
	default:
		actionHTML = fmt.Sprintf(pillowCodeAction, s.Action.Label)
	}

	var footerHTML string
	if s.FooterBy != "" {
		footerHTML = fmt.Sprintf(
			`<p style="margin:0;font-size:12px;line-height:1.6;color:#8E8E93;">这封邮件由 <span style="color:#3C3C43;">%s</span> 代 %s 发送</p>`+
				`<p style="margin:2px 0 0;font-size:11px;line-height:1.6;color:#C7C7CC;">%s</p>`,
			s.FooterBy, s.Brand, s.FooterLine,
		)
	} else {
		// 自营产品：单行页脚，无"代发"行。
		footerHTML = fmt.Sprintf(
			`<p style="margin:0;font-size:12px;line-height:1.6;color:#8E8E93;">%s</p>`,
			s.FooterLine,
		)
	}

	return fmt.Sprintf(pillowTmpl,
		s.Title,        // %[1]s  <title>
		s.LogoURL,      // %[2]s  logo src
		s.Brand,        // %[3]s  img alt + brand 文字
		s.Subtitle,     // %[4]s  brand 下方小字
		s.Heading,      // %[5]s  H1
		s.Description,  // %[6]s  H1 下方说明
		actionHTML,     // %[7]s  主元素（pill 或按钮 + fallback）
		s.Expiry,       // %[8]s  有效期
		s.SecurityNote, // %[9]s  安全提示
		footerHTML,     // %[10]s 页脚（已 pre-render，整段嵌入）
	)
}

// pillowTmpl Pillow 容器；编号与 RenderScenarioHTML 的 fmt 参数严格对应。
// 改这个文件请同步改 RenderScenarioHTML 的注释编号。
const pillowTmpl = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>%[1]s</title>
</head>
<body style="margin:0;padding:32px 16px;background:#F2F2F7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','PingFang SC','Helvetica Neue',sans-serif;color:#1C1C1E;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:22px;box-shadow:0 0 0 1px rgba(0,0,0,0.04),0 12px 32px rgba(0,0,0,0.06);">
  <tr><td style="padding:36px 32px 12px;text-align:center;">
    <img src="%[2]s" alt="%[3]s" width="56" height="56" style="display:inline-block;width:56px;height:56px;border:0;outline:none;text-decoration:none;border-radius:12px;" />
    <p style="margin:12px 0 0;font-size:15px;font-weight:600;letter-spacing:0.2px;color:#1C1C1E;">%[3]s</p>
    <p style="margin:2px 0 0;font-size:12px;color:#8E8E93;letter-spacing:0.2px;">%[4]s</p>
  </td></tr>
  <tr><td style="padding:24px 32px 8px;">
    <h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25;letter-spacing:-0.018em;color:#1C1C1E;text-align:center;">%[5]s</h1>
  </td></tr>
  <tr><td style="padding:0 32px 24px;">
    <p style="margin:0;font-size:14px;line-height:1.55;color:#3C3C43;text-align:center;">%[6]s</p>
  </td></tr>
  %[7]s
  <tr><td style="padding:0 32px 8px;">
    <p style="margin:0;font-size:14px;line-height:1.55;color:#3C3C43;text-align:center;">%[8]s</p>
  </td></tr>
  <tr><td style="padding:0 32px 32px;">
    <p style="margin:0;font-size:13px;line-height:1.55;color:#8E8E93;text-align:center;">%[9]s</p>
  </td></tr>
</table>
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:20px auto 0;">
  <tr><td style="text-align:center;">
    %[10]s
  </td></tr>
</table>
</body>
</html>`

// pillowCodeAction Pillow 验证码 pill（ActionCode 时使用）。
// %[1]s = Label（已 escape）
const pillowCodeAction = `<tr><td style="padding:0 32px 24px;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;border-radius:14px;">
    <tr><td style="padding:22px 16px;text-align:center;">
      <span style="font-family:'SF Mono','JetBrains Mono',Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:8px;color:#1C1C1E;">%[1]s</span>
    </td></tr>
  </table>
</td></tr>`

// pillowButtonAction Pillow 蓝色 CTA 按钮 + fallback 链接（ActionButton 时使用）。
// %[1]s = Label（按钮文字，已 escape）；%[2]s = URL（已 escape，href 与 fallback 链接共用）。
const pillowButtonAction = `<tr><td align="center" style="padding:8px 32px 24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr><td align="center" style="background:#007AFF;border-radius:14px;box-shadow:0 6px 16px rgba(0,122,255,0.25);">
      <a href="%[2]s" target="_blank" style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:600;letter-spacing:0.2px;color:#FFFFFF;text-decoration:none;">%[1]s</a>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:0 32px 12px;">
  <p style="margin:0;font-size:13px;color:#8E8E93;text-align:center;">按钮无法使用？复制以下链接到浏览器打开：</p>
</td></tr>
<tr><td style="padding:0 32px 24px;">
  <p style="margin:0;padding:14px 16px;background:#F5F5F7;border:1px solid #ECECEF;border-radius:10px;font-size:12px;line-height:1.6;word-break:break-all;color:#3C3C43;font-family:'SF Mono','JetBrains Mono',Menlo,Consolas,monospace;text-align:center;">%[2]s</p>
</td></tr>`

// Pillow 页脚：footerHTML 已在 RenderScenarioHTML 里按 FooterBy 是否为空
// pre-render 为"双行代发 + FooterLine"或"单行 FooterLine"，这里只插一个 %[10]s。
