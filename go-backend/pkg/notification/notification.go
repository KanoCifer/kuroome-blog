// Package notification 提供通用通知能力：纯文本 Message + 收件上下文
// NotificationContext，以及可注入的渠道注册表。渠道（飞书 / Email / Bark）
// 各自实现 Channel 接口，只负责把 Message 发到对应端点；配置校验下沉进
// Channel.Send，不再单列校验抽象方法。设计对齐 Python 后端
// backend/app/plugins/notification。
package notification

import "context"

// Message 通用通知消息 —— 只含文本，不含任何领域字段。
//
// Title 为标题；Body 为纯文本正文（Bark / 飞书 markdown 渠道使用）；
// HTML 为 HTML 正文（Email 渠道使用），为空时由 Email 渠道退化为转义后的
// Body。
//
// Color 为飞书卡片的 header 模板色（blue / green / red / orange / yellow /
// violet / purple / indigo / turquoise / wathet / carmine / grey / default），
// 空时 FeishuChannel 默认 "green"。其它渠道忽略此字段。
type Message struct {
	Title string
	Body  string
	HTML  string
	Color string
}

// NotificationContext 渠道收件人配置 —— 纯传输层，不含业务 ID，不查库。
//
// 调用方负责把 profile / reminder_config 等业务数据解析为这些字段，
// 本包只管"拿着这些地址发消息"。缺省字段对应的渠道会直接返回失败，
// 不做 DB 回退。
type NotificationContext struct {
	Email            string // 收件邮箱，Email 渠道使用
	FeishuWebhookURL string // 飞书机器人 webhook，优先级高于全局配置
	BarkDeviceKey    string // Bark 设备 key，Bark 渠道使用
}

// Channel 传输 adapter 接口 —— 唯一通用方法 Send。
//
// 每个具体渠道（Bark / 飞书 / Email）实现此接口，把 Message 发到对应端点。
// 返回是否发送成功；具体异常由实现内部记录。
type Channel interface {
	// Name 返回渠道唯一标识，如 "feishu" / "email" / "bark"。
	Name() string
	// Send 发送一条消息到本渠道，返回是否成功。
	Send(ctx context.Context, msg Message, nc NotificationContext) bool
}
