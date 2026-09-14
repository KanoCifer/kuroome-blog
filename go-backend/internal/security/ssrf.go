// Package security 提供跨包复用的安全 helper。当前仅含 SSRF 防护：
// 解析 URL → 解析所有 A/AAAA → 拒绝 loopback / 私网 / link-local /
// 云元数据段；并提供 DialContext 与 CheckRedirect 钩子，在 DNS rebinding
// 与重定向场景下复用同一份判定。
//
// 仅做"必须挡"的最小集合。允许列表(host 白名单)是更稳的方案，
// 但 ProxyBlob 面向任意 https 图片源，白名单不适用。
package security

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"syscall"
	"time"
)

// ErrSSRFBlocked 命中 SSRF 规则时返回的错误。调用方据此回 4xx。
var ErrSSRFBlocked = errors.New("security: ssrf blocked")

// maxRedirects SSRF 防护下重定向上限（http.Client 默认是 10，偏大）；
// 收紧避免反复跨域跳转拖延连接池。
const maxRedirects = 5

// dialResolveTimeout 解析 + 拨号合计上限，留足余量给慢 DNS。
const dialResolveTimeout = 5 * time.Second

// AllowPrivateIP 测试专用 hook：true 时所有 IP 都视为合法。生产路径
// 永远不应打开。test/ssrf_test.go 会在 t.Cleanup 里恢复。
var AllowPrivateIP = false

// ValidateURL 入参 URL 静态校验：scheme 必须是 https、host 非空，
// 并解析 host 的所有 IP 后拒绝私网/loopback/link-local。
//
// 这一步在拿到 URL 立刻做，挡住纯字符串层面的攻击；
// DNS rebinding 由 SafeDialContext 在每次 Connect 前再判一次兜底。
func ValidateURL(ctx context.Context, u *url.URL) error {
	if u.Scheme != "https" {
		return fmt.Errorf("%w: scheme must be https", ErrSSRFBlocked)
	}
	host := u.Hostname()
	if host == "" {
		return fmt.Errorf("%w: empty host", ErrSSRFBlocked)
	}

	// 字面量 IP 走 ParseIP 跳过 DNS；域名走 LookupIP。
	ips, err := resolveHost(ctx, host)
	if err != nil {
		return fmt.Errorf("%w: resolve %s: %v", ErrSSRFBlocked, host, err)
	}
	if len(ips) == 0 {
		return fmt.Errorf("%w: no ip for %s", ErrSSRFBlocked, host)
	}
	for _, ip := range ips {
		if !ipAllowed(ip) {
			return fmt.Errorf("%w: %s resolves to %s", ErrSSRFBlocked, host, ip)
		}
	}
	return nil
}

// SafeTransport 返回一个带 SSRF 防护的 http.Transport。DialContext
// 在每次握手前重解域名并复检 IP，CheckRedirect 每次跳转前对 newurl
// 调用 ValidateURL。
//
// ponytail: 故意使用 http.DefaultTransport 拷贝以复用连接池与 HTTP/2
// 配置；没有引入新依赖。若后续需更细粒度（如限速、QUIC），可在此替换。
func SafeTransport() *http.Transport {
	t := http.DefaultTransport.(*http.Transport).Clone()
	t.DialContext = SafeDialContext()
	return t
}

// SafeClient 返回一个 SSRF-safe 的 http.Client。maxRedirects 收紧到
// 5（http.DefaultClient 是 10），避免重定向链滥用连接池。
func SafeClient() *http.Client {
	return &http.Client{
		Transport:  SafeTransport(),
		CheckRedirect: safeCheckRedirect,
		Timeout:    30 * time.Second,
	}
}

// SafeDialContext 返回一个 DialContext：每次连接前解析目标 host 的
// 当前 IP 并拒绝私网地址，挡 DNS rebinding（解析时间不一致）。
//
// 返回的函数签名匹配 net.Dialer{}.DialContext。
func SafeDialContext() func(context.Context, string, string) (net.Conn, error) {
	d := &net.Dialer{Timeout: 10 * time.Second, KeepAlive: 30 * time.Second}
	return func(ctx context.Context, network, address string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(address)
		if err != nil {
			return nil, err
		}
		rctx, cancel := context.WithTimeout(ctx, dialResolveTimeout)
		defer cancel()
		ips, err := resolveHost(rctx, host)
		if err != nil {
			return nil, fmt.Errorf("%w: resolve %s: %v", ErrSSRFBlocked, host, err)
		}
		for _, ip := range ips {
			if !ipAllowed(ip) {
				return nil, fmt.Errorf("%w: %s resolves to %s", ErrSSRFBlocked, host, ip)
			}
		}
		// 用解析得到的第一个 IP 拨号；如果有多个（v4+v6），逐个尝试。
		var lastErr error
		for _, ip := range ips {
			c, derr := d.DialContext(ctx, network, net.JoinHostPort(ip.String(), port))
			if derr == nil {
				return c, nil
			}
			lastErr = derr
		}
		if lastErr == nil {
			lastErr = syscall.EHOSTUNREACH
		}
		return nil, lastErr
	}
}

func safeCheckRedirect(req *http.Request, via []*http.Request) error {
	if len(via) >= maxRedirects {
		return fmt.Errorf("%w: too many redirects (%d)", ErrSSRFBlocked, maxRedirects)
	}
	if err := ValidateURL(req.Context(), req.URL); err != nil {
		return err
	}
	return nil
}

// resolveHost 把 host 解析为所有 IP。字面量 IP 走 ParseIP，
// 域名走 LookupIP（含 IPv4 + IPv6）。
func resolveHost(ctx context.Context, host string) ([]net.IP, error) {
	if ip := net.ParseIP(host); ip != nil {
		return []net.IP{ip}, nil
	}
	addrs, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return nil, err
	}
	out := make([]net.IP, 0, len(addrs))
	for _, a := range addrs {
		if a.IP != nil {
			out = append(out, a.IP)
		}
	}
	return out, nil
}

// ipAllowed 判定单个 IP 是否可外联。命中以下任一即拒绝：
//   - loopback        127.0.0.0/8, ::1
//   - private         10/8, 172.16/12, 192.168/16, fc00::/7
//   - link-local      169.254/16, fe80::/10（包含云元数据 169.254.169.254）
//   - unspecified     0.0.0.0, ::
//   - multicast       224.0.0.0/4, ff00::/8
//   - IPv4-mapped IPv6 走 v4 判定
func ipAllowed(ip net.IP) bool {
	if AllowPrivateIP {
		return true
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() || ip.IsUnspecified() || ip.IsMulticast() {
		return false
	}
	return true
}
