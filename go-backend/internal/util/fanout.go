package util

import (
	"context"
	"log/slog"
	"sync"
)

// Result 包装一次 FanOut 任务的结果（值 + 错误）。
type Result[T any] struct {
	Value T
	Error error
}

// FanOut 并发执行 fns，按完成顺序把结果送到返回的 channel，全部完成后关闭。
//
// 完成顺序不定，因此调用方须自行给结果打标签（或按数量收齐），不能假设
// channel 顺序与 fns 顺序一致。
//
// 每个任务在自己的 goroutine 里 recover：单个任务 panic 只丢该任务的结果，
// 不会掀翻整个进程；调用方按收到的结果条数决定是否提前返回。
func FanOut[T any](ctx context.Context, fns ...func(ctx context.Context) (T, error)) <-chan Result[T] {
	ch := make(chan Result[T], len(fns))
	wg := sync.WaitGroup{}

	wg.Add(len(fns))
	for _, fn := range fns {
		go func() {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					slog.ErrorContext(ctx, "FanOut worker panicked",
						"panic", r,
					)
				}
			}()

			result, err := fn(ctx)
			select {
			case ch <- Result[T]{Value: result, Error: err}:
			case <-ctx.Done():

			}
		}()
	}

	go func() {
		wg.Wait()
		close(ch)
	}()

	return ch
}
