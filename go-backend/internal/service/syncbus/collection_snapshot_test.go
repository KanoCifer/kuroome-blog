package syncbus

import (
	"context"
	"encoding/json"
	"testing"
	"time"
)

func sampleSnap(id string) CollectionSnapshot {
	return CollectionSnapshot{
		ID:         id,
		Source:     "1688",
		CapturedAt: time.Now().Unix(),
		From:       "A",
		Name:       "MacBook",
		Snapshot:   json.RawMessage(`{"title":"x"}`),
	}
}

// TestCollection_PutClaimReadOnly 写入后只读认领可拿到条目，且条目仍在池中。
func TestCollection_PutClaimReadOnly(t *testing.T) {
	bus, mr := newTestBus(t)
	ctx := context.Background()

	if err := bus.CollectionPut(ctx, 7, sampleSnap("s1")); err != nil {
		t.Fatalf("CollectionPut: %v", err)
	}
	snap, err := bus.CollectionClaim(ctx, 7, "s1")
	if err != nil {
		t.Fatalf("CollectionClaim: %v", err)
	}
	if snap == nil || snap.ID != "s1" || snap.Name != "MacBook" || string(snap.Snapshot) != `{"title":"x"}` {
		t.Fatalf("claim = %+v", snap)
	}
	if got := mr.HGet("nomu:sync:collection:7", "s1"); got == "" {
		t.Fatal("read-only claim must keep the entry in the pool")
	}

	// 不在池中 → (nil, nil)。
	if snap, err := bus.CollectionClaim(ctx, 7, "missing"); err != nil || snap != nil {
		t.Fatalf("claim missing = (%+v, %v), want (nil, nil)", snap, err)
	}
}

// TestCollection_List 列出全池，认领清除后池中减少。
func TestCollection_List(t *testing.T) {
	bus, _ := newTestBus(t)
	ctx := context.Background()
	if got, err := bus.CollectionList(ctx, 7); err != nil || len(got) != 0 {
		t.Fatalf("empty list = (%v, %v), want empty", got, err)
	}
	for _, id := range []string{"s1", "s2"} {
		if err := bus.CollectionPut(ctx, 7, sampleSnap(id)); err != nil {
			t.Fatalf("CollectionPut %s: %v", id, err)
		}
	}
	got, err := bus.CollectionList(ctx, 7)
	if err != nil {
		t.Fatalf("CollectionList: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("list len = %d, want 2", len(got))
	}
	if _, err := bus.CollectionClaimClear(ctx, 7, "B", "s1"); err != nil {
		t.Fatalf("CollectionClaimClear: %v", err)
	}
	got, _ = bus.CollectionList(ctx, 7)
	if len(got) != 1 || got[0].ID != "s2" {
		t.Fatalf("list after clear = %+v, want [s2]", got)
	}
}

// TestCollection_ClaimClearIsAtomic 认领并清除摘除条目，二次认领得 nil（并发只有一方拿到）。
func TestCollection_ClaimClearIsAtomic(t *testing.T) {
	bus, mr := newTestBus(t)
	ctx := context.Background()
	if err := bus.CollectionPut(ctx, 7, sampleSnap("s1")); err != nil {
		t.Fatalf("CollectionPut: %v", err)
	}

	snap, err := bus.CollectionClaimClear(ctx, 7, "B", "s1")
	if err != nil || snap == nil || snap.ID != "s1" {
		t.Fatalf("first ClaimClear = (%+v, %v)", snap, err)
	}
	if got := mr.HGet("nomu:sync:collection:7", "s1"); got != "" {
		t.Fatal("entry should be removed after claim_clear")
	}
	if snap, err := bus.CollectionClaimClear(ctx, 7, "C", "s1"); err != nil || snap != nil {
		t.Fatalf("second ClaimClear = (%+v, %v), want (nil, nil)", snap, err)
	}
}

// TestCollection_SubscribeNotifies put/claim_clear 池变更广播到订阅方。
func TestCollection_SubscribeNotifies(t *testing.T) {
	bus, _ := newTestBus(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	ch, cancelSub, err := bus.SubscribeCollection(ctx, 7)
	if err != nil {
		t.Fatalf("SubscribeCollection: %v", err)
	}
	defer cancelSub()

	if err := bus.CollectionPut(ctx, 7, sampleSnap("s1")); err != nil {
		t.Fatalf("CollectionPut: %v", err)
	}
	if _, err := bus.CollectionClaimClear(ctx, 7, "B", "s1"); err != nil {
		t.Fatalf("CollectionClaimClear: %v", err)
	}

	want := []string{"put", "claim_clear"}
	for _, kind := range want {
		select {
		case upd := <-ch:
			if upd.Kind != kind || upd.ID != "s1" {
				t.Fatalf("update = %+v, want kind=%s id=s1", upd, kind)
			}
		case <-time.After(2 * time.Second):
			t.Fatalf("timed out waiting for %s update", kind)
		}
	}
}
