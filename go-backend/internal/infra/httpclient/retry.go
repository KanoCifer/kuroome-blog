package httpclient

import (
	"context"
	"net/http"
	"time"
)

// maxRetry 可重试失败的额外重试次数（总计 maxRetry+1 次尝试）。
const maxRetry = 3

// DoWithRetry 带退避重试的 HTTP 请求。
//
// 重试判据：网络错误，或上游 5xx。4xx 视为确定性失败，直接返回响应。
//
// 调用方一旦断开，请求 ctx 立即取消，此后每次重试都必然立刻失败、退避 sleep
// 纯属空烧。因此 ctx 结束即收手，退避也改成可被 ctx 打断，避免调用方已返回
// 却还占着 goroutine。
//
// body 归属：重试耗尽的最后一轮不关闭 body，交由调用方读取上游错误详情后自行
// 关闭；被丢弃的中间轮与本函数判定放弃的轮次在此关闭。
func DoWithRetry(ctx context.Context, cli *Client, req *http.Request) (*http.Response, error) {
	var resp *http.Response
	var err error

	for i := 0; i <= maxRetry; i++ {
		resp, err = cli.Do(ctx, req)
		if err == nil && resp.StatusCode < 500 {
			return resp, nil
		}

		// 最后一轮或调用方已断开：不再重试
		if i == maxRetry || ctx.Err() != nil {
			if ctx.Err() != nil && resp != nil {
				// 调用方已走，body 不会被读，就地关闭
				resp.Body.Close()
			}
			return resp, err
		}

		if resp != nil {
			resp.Body.Close()
		}

		select {
		case <-time.After(time.Duration(i+1) * time.Second):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}

	return resp, err
}
