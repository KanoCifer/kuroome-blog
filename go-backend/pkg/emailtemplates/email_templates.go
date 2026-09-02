// Package emailtemplates 集中 user service 的注册验证码 + 魔法登录两套邮件模板。
//
// 两种 mode 共用同一调性（克制编辑式），仅通过品牌头部差异化：
//   - blog: 纯文字 wordmark，无 logo，编辑式极简
//   - nomu: logo + "Nomu" 副标，CTA / 页脚改为 Nomu 文案
//
// 末尾明文链接 / 验证码 fallback 保留，兼容屏蔽按钮或图片的客户端。
package emailtemplates

import (
	"fmt"
	"html"

	"github.com/KanoCifer/kuroome-blog/pkg/notification"
)

// mode 常量与 internal/service/user_service.go 复用同一字符串字面量；
// 这里独立声明，避免反向依赖 internal 包。
const (
	modeBlog = "blog"
	modeNomu = "nomu"
)

// NomuLogoURL 是 nomu 邮件模板品牌头部的 logo 地址；test 用此常量做包含断言。
const NomuLogoURL = "https://kanocifer.chat/logo/logo.png"

// VerificationEmail 构造注册验证码邮件内容与纯文本 fallback。
//
// mode 决定：
//  1. 邮件标题 + HTML 模板（blog 走编辑式极简，nomu 走 logo + 品牌副标）
//  2. 渲染走对应 HTML 函数；调用方按 mode 自行管理 Redis key 命名空间。
func VerificationEmail(code, mode string) notification.Message {
	title := "kanocifer.chat 注册验证码"
	if mode == modeNomu {
		title = "Nomu 注册验证码"
	}
	plain := fmt.Sprintf("您的验证码：%s\n请在5分钟内使用。", code)
	return notification.Message{
		Title: title,
		Body:  plain,
		HTML:  RenderVerificationHTML(code, mode),
	}
}

// MagicLoginEmail 构造魔法登录邮件内容与纯文本 fallback。
//
// mode 决定标题 + HTML 模板。
func MagicLoginEmail(link, mode string) notification.Message {
	title := "kanocifer.chat 登录链接"
	if mode == modeNomu {
		title = "Nomu 登录链接"
	}
	plain := fmt.Sprintf("点击下方链接登录（10 分钟内有效）：\n%s\n若非本人操作，请忽略此邮件。", link)
	return notification.Message{
		Title: title,
		Body:  plain,
		HTML:  RenderMagicLoginHTML(link, mode),
	}
}

// RenderMagicLoginHTML 渲染魔法登录邮件 HTML。
func RenderMagicLoginHTML(link, mode string) string {
	if mode == modeNomu {
		return renderMagicLoginHTMLNomu(link)
	}
	return renderMagicLoginHTMLBlog(link)
}

func renderMagicLoginHTMLBlog(link string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>kanocifer.chat 登录链接</title>
</head>
<body style="margin:0;padding:32px 16px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
<tr><td style="padding:0 0 24px;text-align:left;">
  <span style="font-size:14px;font-weight:600;letter-spacing:-0.2px;color:#1a1a1a;">kanocifer.chat</span>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid #ececec;border-radius:14px;padding:36px 32px;">
  <p style="margin:0 0 6px;font-size:13px;color:#888888;letter-spacing:0.2px;">魔法登录</p>
  <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;line-height:1.4;color:#1a1a1a;letter-spacing:-0.2px;">点击下方按钮登录</h1>
  <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#6b6b6b;">无需输入密码，单击按钮即可登录您的账号。</p>
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:4px 0 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="background:#1a1a1a;border-radius:10px;">
      <a href="%[1]s" target="_blank" style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:600;letter-spacing:0.2px;color:#ffffff;text-decoration:none;">登录 kanocifer.chat</a>
    </td></tr>
    </table>
  </td></tr>
  </table>
  <p style="margin:28px 0 8px;font-size:13px;color:#888888;">按钮无法使用？复制以下链接到浏览器打开：</p>
  <p style="margin:0;padding:12px 14px;background:#fafafa;border:1px solid #f0f0f0;border-radius:8px;font-size:12px;line-height:1.6;word-break:break-all;color:#555555;font-family:'SF Mono','JetBrains Mono',Consolas,Menlo,monospace;">%[1]s</p>
  <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#999999;">链接 10 分钟内有效，仅可使用一次。若非本人操作，请忽略此邮件。</p>
</td></tr>
<tr><td style="padding:20px 4px 0;text-align:left;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:#aaaaaa;">kanocifer.chat · 魔法登录</p>
</td></tr>
</table>
</body>
</html>`, html.EscapeString(link))
}

func renderMagicLoginHTMLNomu(link string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nomu 登录链接</title>
</head>
<body style="margin:0;padding:32px 16px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
<tr><td style="padding:0 0 28px;text-align:center;">
  <img src="%[1]s" alt="Nomu" width="64" height="64" style="display:inline-block;width:64px;height:64px;border:0;outline:none;text-decoration:none;" />
  <p style="margin:14px 0 0;font-size:13px;font-weight:600;letter-spacing:0.4px;color:#1a1a1a;">Nomu</p>
  <p style="margin:4px 0 0;font-size:12px;color:#888888;letter-spacing:0.2px;">Chrome 扩展 · 一键登录</p>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid #ececec;border-radius:14px;padding:32px 28px;">
  <h1 style="margin:0 0 6px;font-size:20px;font-weight:600;line-height:1.3;color:#1a1a1a;letter-spacing:-0.2px;">点击下方按钮完成登录</h1>
  <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#6b6b6b;">点击后会自动打开 Nomu 并完成登录。</p>
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:4px 0 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="background:#1a1a1a;border-radius:10px;">
      <a href="%[2]s" target="_blank" style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:600;letter-spacing:0.2px;color:#ffffff;text-decoration:none;">完成 Nomu 登录</a>
    </td></tr>
    </table>
  </td></tr>
  </table>
  <p style="margin:28px 0 8px;font-size:13px;color:#888888;">按钮无法使用？复制以下链接到浏览器打开：</p>
  <p style="margin:0;padding:12px 14px;background:#fafafa;border:1px solid #f0f0f0;border-radius:8px;font-size:12px;line-height:1.6;word-break:break-all;color:#555555;font-family:'SF Mono','JetBrains Mono',Consolas,Menlo,monospace;">%[2]s</p>
  <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#999999;">链接 10 分钟内有效，仅可使用一次。若非本人操作，请忽略此邮件。</p>
</td></tr>
<tr><td style="padding:20px 4px 0;text-align:center;">
  <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#aaaaaa;">这封邮件由 <span style="color:#888888;">kanocifer.chat</span> 代 Nomu 发送</p>
  <p style="margin:0;font-size:12px;line-height:1.6;color:#cccccc;">Nomu · 魔法登录</p>
</td></tr>
</table>
</body>
</html>`, NomuLogoURL, html.EscapeString(link))
}

// RenderVerificationHTML 渲染注册验证码邮件 HTML。
func RenderVerificationHTML(code, mode string) string {
	if mode == modeNomu {
		return renderVerificationHTMLNomu(code)
	}
	return renderVerificationHTMLBlog(code)
}

func renderVerificationHTMLBlog(code string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>kanocifer.chat 注册验证码</title>
</head>
<body style="margin:0;padding:32px 16px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
<tr><td style="padding:0 0 24px;text-align:left;">
  <span style="font-size:14px;font-weight:600;letter-spacing:-0.2px;color:#1a1a1a;">kanocifer.chat</span>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid #ececec;border-radius:14px;padding:36px 32px;">
  <p style="margin:0 0 6px;font-size:13px;color:#888888;letter-spacing:0.2px;">注册验证码</p>
  <h1 style="margin:0 0 28px;font-size:18px;font-weight:600;line-height:1.4;color:#1a1a1a;letter-spacing:-0.2px;">这是您的验证码</h1>
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #f0f0f0;border-radius:10px;">
  <tr><td style="padding:24px 16px;text-align:center;">
    <span style="font-family:'SF Mono','JetBrains Mono',Consolas,Menlo,monospace;font-size:36px;font-weight:600;letter-spacing:8px;color:#1a1a1a;">%s</span>
  </td></tr>
  </table>
  <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#6b6b6b;">请在 5 分钟内使用。验证码仅用于本次注册，不会以任何形式再次索取。</p>
  <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#999999;">若非本人操作，请忽略此邮件。</p>
</td></tr>
<tr><td style="padding:20px 4px 0;text-align:left;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:#aaaaaa;">kanocifer.chat · 注册验证码</p>
</td></tr>
</table>
</body>
</html>`, html.EscapeString(code))
}

func renderVerificationHTMLNomu(code string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nomu 注册验证码</title>
</head>
<body style="margin:0;padding:32px 16px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
<tr><td style="padding:0 0 28px;text-align:center;">
  <img src="%s" alt="Nomu" width="64" height="64" style="display:inline-block;width:64px;height:64px;border:0;outline:none;text-decoration:none;" />
  <p style="margin:14px 0 0;font-size:13px;font-weight:600;letter-spacing:0.4px;color:#1a1a1a;">Nomu</p>
  <p style="margin:4px 0 0;font-size:12px;color:#888888;letter-spacing:0.2px;">Chrome 扩展 · 邮箱验证</p>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid #ececec;border-radius:14px;padding:32px 28px;">
  <h1 style="margin:0 0 6px;font-size:20px;font-weight:600;line-height:1.3;color:#1a1a1a;letter-spacing:-0.2px;">这是您的验证码</h1>
  <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b6b6b;">用于完成 Nomu 账号注册，请妥善保管。</p>
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #f0f0f0;border-radius:10px;">
  <tr><td style="padding:24px 16px;text-align:center;">
    <span style="font-family:'SF Mono','JetBrains Mono',Consolas,Menlo,monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#1a1a1a;">%s</span>
  </td></tr>
  </table>
  <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#6b6b6b;">请在 5 分钟内使用。验证码仅用于本次注册，不会以任何形式再次索取。</p>
  <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#999999;">若非本人操作，请忽略此邮件。</p>
</td></tr>
<tr><td style="padding:20px 4px 0;text-align:center;">
  <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#aaaaaa;">这封邮件由 <span style="color:#888888;">kanocifer.chat</span> 代 Nomu 发送</p>
  <p style="margin:0;font-size:12px;line-height:1.6;color:#cccccc;">Nomu · 注册验证码</p>
</td></tr>
</table>
</body>
</html>`, NomuLogoURL, html.EscapeString(code))
}