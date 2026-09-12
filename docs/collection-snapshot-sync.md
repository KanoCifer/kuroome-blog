# Nomu 采集快照云端池 — 扩展端接入指南

扩展端通过 Nomu 同步长连接（WebSocket）接入**同账号云端池**：任一设备把采集快照写入账号级池，同账号其它在线设备实时收到变更通知，并可认领条目。本指南只覆盖云端池，不含 `push` / `ack` 的设备间投递。

## 连接

```
ws(s)://<host>/v3/nomu/sync/ws?token=<JWT>&device_id=<设备ID>&name=<设备名>
```

| 参数        | 必填 | 说明                                                             |
| ----------- | ---- | ---------------------------------------------------------------- |
| `token`     | 是   | 用户 JWT（`Authorization: Bearer` 的同一枚）。WS 无法设请求头，故走 query。 |
| `device_id` | 是   | 本设备稳定标识；用于寻址与投递。                                 |
| `name`      | 否   | 设备展示名（如店铺 code），缺省回退为 `device_id`。               |

握手失败返回普通 HTTP 状态码，不会升级：缺 `token`/`device_id` → `400`，token 非法 → `401`。请勿在未收到 `close` 时假定连接有效——用应用层 `ping` 保活（见下）。

## 帧格式

所有帧都是 JSON 对象，顶层必带 `type`。请求可带客户端生成的 `requestId`，服务端在对应响应帧原样回传，用于并发请求的关联。

## 池操作

### 1. 写入池

```jsonc
// →
{ "type": "collection_put", "id": "s1", "source": "1688", "payload": { "title": "..." }, "requestId": "r1" }

// ←
{ "type": "collection_put_ok", "id": "s1", "requestId": "r1" }
```

| 字段      | 必填 | 说明                                                              |
| --------- | ---- | ----------------------------------------------------------------- |
| `id`      | 是   | 快照唯一标识，即池中 Hash field。同 id 会覆盖。                   |
| `source`  | 否   | 采集来源，约定 `taobao` / `1688` / `jd` / `other`。               |
| `payload` | 是   | 快照原始 JSON，服务端不解释其内部结构。                           |

`from`（写入方 device_id）与 `name`（写入方设备名）由服务端从连接上下文补全，客户端无需传。写入成功会向全账号在线设备广播 `put` 变更（含写入方自己）。

失败返回 `{ "type": "collection_put_error", "id", "requestId", "error" }`。

### 2. 列全池

```jsonc
// →
{ "type": "collection_list", "requestId": "r2" }

// ←
{ "type": "collection_list_result", "ok": true, "requestId": "r2", "snapshots": [ /* CollectionSnapshot[] */ ] }
```

连接建立后调用一次即可渲染已有条目（后续增量靠 `collection_update`）。空池返回 `snapshots: []`。只读，不广播。

### 3. 认领（只读）

```jsonc
// →
{ "type": "collection_claim", "id": "s1", "requestId": "r3" }

// ←
{ "type": "collection_claim_result", "ok": true, "requestId": "r3", "snapshot": { /* CollectionSnapshot | null */ } }
```

读取一条并**保留**池中条目。`snapshot: null` 表示条目不存在。只读，不广播。

### 4. 认领并清除

```jsonc
// →
{ "type": "collection_claim_clear", "id": "s1", "requestId": "r4" }

// ←
{ "type": "collection_claim_clear_result", "ok": true, "requestId": "r4", "snapshot": { /* CollectionSnapshot | null */ } }
```

原子取出并摘除一条。**并发语义**：多设备同时认领同一 id 时，只有一方拿到 `snapshot`，其余得 `null`——可用于「抢单」式独占认领。成功摘除会向全账号广播 `claim_clear`。

> 认领 vs 认领并清除：`collection_claim` 是只读预览，`collection_claim_clear` 是独占摘取。两者都不返回整池，用 `collection_list` 拿全量。

## 池变更广播

池发生写入或摘除时，服务端向**本账号全部在线连接**推送：

```jsonc
{
  "type": "collection_update",
  "update": { "kind": "put" | "claim_clear", "id": "s1", "from": "A", "at": 1789198649 }
}
```

收到 `put` 可增量插入列表，收到 `claim_clear` 可移除对应条目；也可据此节流调用 `collection_list` 做一次全量对齐。

## CollectionSnapshot

写入方通过 `collection_put` 提交，服务端存整份如下结构，读取/广播均以此形态返回：

```jsonc
{
  "id": "s1",
  "source": "1688",        // 可空
  "captured_at": 1789198649, // 采集时间（服务端写入时刻，unix 秒）
  "from": "A",              // 写入方 device_id（服务端补全）
  "name": "店铺code",       // 写入方设备名（服务端补全）
  "snapshot": { }           // 客户端原始 payload
}
```

## 保活

```jsonc
// →
{ "type": "ping", "requestId": "r5" }        // 可带 "name" 顺带刷新设备名，留空则保留旧名

// ←
{ "type": "pong", "requestId": "r5", "devices": [ { "deviceId": "A", "name": "店铺code", "online": true, "lastSeen": 1789198649 } ] }
```

按 30s 级间隔发送 `ping`；连接静默断开时靠它触发重连。`devices` 顺带回当前账号已知设备（含在线标记），可直接用于设备选择器，无需额外请求。

## 最小示例

```js
const token = "…"; // 用户 JWT
const deviceId = "A";
const ws = new WebSocket(
  `wss://api.example.com/v3/nomu/sync/ws?token=${encodeURIComponent(token)}&device_id=${deviceId}&name=${encodeURIComponent("店铺code")}`,
);

let seq = 0;
const pending = new Map(); // requestId -> resolve

ws.onmessage = ({ data }) => {
  const frame = JSON.parse(data);
  if (frame.requestId && pending.has(frame.requestId)) {
    pending.get(frame.requestId)(frame);
    pending.delete(frame.requestId);
  } else if (frame.type === "collection_update") {
    // 增量刷新池 UI
    console.log("pool changed", frame.update);
  }
};

const rpc = (msg) =>
  new Promise((resolve) => {
    const requestId = `r${++seq}`;
    pending.set(requestId, resolve);
    ws.send(JSON.stringify({ ...msg, requestId }));
  });

ws.onopen = async () => {
  const { snapshots } = await rpc({ type: "collection_list" }); // 渲染已有池
  console.log(snapshots);

  await rpc({ type: "collection_put", id: "s1", source: "1688", payload: { title: "x" } });
  const { snapshot } = await rpc({ type: "collection_claim_clear", id: "s1" }); // 独占摘取
  if (snapshot) console.log("claimed", snapshot);
};

setInterval(() => ws.readyState === WebSocket.OPEN && rpc({ type: "ping" }), 30_000);
```

## 注意事项

- **服务端不校验 `payload` 结构**：写入即存、读出即还。请自行保证版本兼容（如 payload 内带 `version`）。
- **池是账号级、无 TTL、无容量上限**：条目只经 `collection_claim_clear` 或同 id 覆盖而消失。扩展端应把已处理条目及时清除，避免池无限增长。
- **同 id 覆盖**：`collection_put` 对已存在的 id 直接覆盖，不报错。
- **`collection_claim` 不摘除**：多个设备可同时读到同一条；要互斥请用 `collection_claim_clear`。
- **广播是「尽力而为」**：通知失败不影响已落地的池写入，也不做补投。连接重连后请用 `collection_list` 全量对齐。
