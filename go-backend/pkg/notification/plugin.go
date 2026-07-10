package notification

import (
	"context"
	"log/slog"
)

// Plugin 通知传输插件 —— 持有渠道注册表，提供 Notify 入口。
//
// 渠道注册表可注入（便于测试注入 fake channel），缺省装配
// Bark / 飞书 / Email 三个内置渠道。
type Plugin struct {
	channels map[string]Channel
}

// NewPlugin 以缺省渠道列表构建插件实例。
//
// 各渠道内部会在发送时按需读取全局配置（webhook / SMTP），无需在此注入。
func NewPlugin() *Plugin {
	channels := []Channel{
		NewBarkChannel(),
		NewFeishuChannel(),
		NewEmailChannel(),
	}
	reg := make(map[string]Channel, len(channels))
	for _, c := range channels {
		reg[c.Name()] = c
	}
	return &Plugin{channels: reg}
}

// Register 注册 / 覆盖一个渠道。
func (p *Plugin) Register(c Channel) {
	p.channels[c.Name()] = c
}

// Notify 发送消息到多个渠道，返回每个渠道的成功与否。
//
// 未知渠道或发送异常记为 false，不影响其它渠道。单渠道失败不应阻断其它
// 渠道；具体异常由渠道内部记录。
func (p *Plugin) Notify(
	ctx context.Context,
	channelNames []string,
	msg Message,
	nc NotificationContext,
) map[string]bool {
	results := make(map[string]bool, len(channelNames))
	for _, name := range channelNames {
		ch, ok := p.channels[name]
		if !ok {
			slog.Warn("[notification] unknown channel", "name", name)
			results[name] = false
			continue
		}
		results[name] = ch.Send(ctx, msg, nc)
	}
	return results
}

// Notify 模块级便捷入口 —— 等价于 NewPlugin().Notify(...)，每次新建默认插件。
//
// 生产路径应复用注入的 *Plugin 单例，而非反复调用此函数。
func Notify(
	ctx context.Context,
	channelNames []string,
	msg Message,
	nc NotificationContext,
) map[string]bool {
	return NewPlugin().Notify(ctx, channelNames, msg, nc)
}
