package eventbus

import (
	"context"
	"log/slog"
	"sync"
	"sync/atomic"
)

type HandlerFunc func(ctx context.Context, topic string, data any)

// Bus is the event bus capability used by consumers. EventBus is the default
// in-process implementation; consumers should depend on this interface.
type Bus interface {
	On(topic string, handler HandlerFunc)
	Emit(ctx context.Context, topic string, data any) bool
	Close(topic string)
	CloseBus()
	Wait()
}

type EventBus struct {
	mu       sync.RWMutex
	wg       sync.WaitGroup
	closed   atomic.Bool
	handlers map[string][]HandlerFunc
}

var _ Bus = (*EventBus)(nil)

func NewEventBus() *EventBus {
	return &EventBus{
		handlers: make(map[string][]HandlerFunc),
	}
}

func (b *EventBus) Close(topic string) {
	b.mu.Lock()
	delete(b.handlers, topic)
	b.mu.Unlock()
}

func (b *EventBus) CloseBus() {
	if b.closed.Swap(true) {
		return
	}
	b.mu.Lock()
	for topic := range b.handlers {
		delete(b.handlers, topic)
	}
	b.mu.Unlock()
}

func (b *EventBus) On(topic string, handler HandlerFunc) {
	if handler == nil {
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.closed.Load() {
		return
	}
	b.handlers[topic] = append(b.handlers[topic], handler)
}

// Emit dispatches an event asynchronously. The bool reports whether at least
// one handler accepted the event; it does not report downstream delivery.
func (b *EventBus) Emit(ctx context.Context, topic string, data any) bool {
	if ctx == nil {
		ctx = context.Background()
	}
	ctx = context.WithoutCancel(ctx)

	b.mu.RLock()
	defer b.mu.RUnlock()
	if b.closed.Load() {
		return false
	}
	handlers, ok := b.handlers[topic]
	if !ok || len(handlers) == 0 {
		return false
	}
	for _, handler := range handlers {
		b.wg.Add(1)
		go func(h HandlerFunc) {
			defer b.wg.Done()
			defer func() {
				if r := recover(); r != nil {
					slog.ErrorContext(ctx, "event handler panic", "topic", topic, "panic", r)
				}
			}()
			h(ctx, topic, data)
		}(handler)
	}
	return true
}

func (b *EventBus) Wait() {
	b.wg.Wait()
}
