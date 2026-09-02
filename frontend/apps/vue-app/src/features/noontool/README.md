# Nomu(NoonToolv1)魔法登录接入契约

> 给 Nomu Chrome 扩展开发者看的对接文档。Nomu 扩展不在 frontend 仓库,本文档是它对接
> kuroome-blog 后端魔法登录端点的对外契约,与 `frontend/packages/api/src/gateways/auth.ts`
> 当前的 `forwardNomuMagicLink` / `pollNomuLogin` / `NomuLoginState` 字段对齐。
>
> 关联 commit:
> - backend:`go-backend` 仓库 `fe91a585`(合并 `MagicLoginConsume` handler)
> - frontend(本文档同步时):`packages/api/src/gateways/auth.ts` 新增 `forwardNomuMagicLink` /
> - `pollNomuLogin` / `NomuLoginState`,新增回调页 `apps/vue-app/src/features/noontool/NomuLoginView.vue`

---

## 1. 整体流程(接法 B)

```
┌──────────────┐                                       ┌──────────────┐
│ Nomu 扩展     │                                       │ kuroome-blog  │
│ (options 页)  │                                       │   Go 后端   │
└──────┬───────┘                                       └──────┬───────┘
       │                                                        │
       │ ① POST /v3/email/magic-login                          │
       │   { email, mode:"nomu", device_id }                   │
       │ ─────────────────────────────────────────────────────►│
       │                                                        │ 写 redis:
       │                                                        │   magiclogintoken:<hex>:nomu  → email  (TTL 10m)
       │                                                        │   nomulogin:hex:<hex>         → device_id
       │                                                        │   nomulogin:device:<device>   → {status:"pending"}
       │                                                        │ 发送邮件,链接:
       │                                                        │   <host>/options.html#/login/magic?token=<hex>:nomu
       │                                                        │
       │ 200 { code:0, msg:"若该邮箱已注册,登录链接已发送" }      │
       │ ◄─────────────────────────────────────────────────────│
       │                                                        │
       │                                            用户在邮箱点链接
       │                                            ↓
       │                                  浏览器落到 options 页
       │                                  hash 路由 /login/magic?token=...
       │                                                        │
       │ (SPA 回调页内部)                                        │
       │ ② POST /v3/nomu/magic-login                            │
       │   { token:"<hex>:nomu", mode:"nomu" }                  │
       │ ─────────────────────────────────────────────────────►│
       │                                                        │ GetDel magiclogintoken → email
       │                                                        │ finishNomuLogin:
       │                                                        │   CreateTokens(u) → access/refresh
       │                                                        │   nomulogin:device:<device> = {status:"done", ...}
       │                                                        │   Del nomulogin:hex:<hex>
       │                                                        │
       │ 200 { code:0, data:null, msg:"登录已确认" }            │
       │ ◄─────────────────────────────────────────────────────│
       │                                                        │
       │ ③ GET /v3/nomu/login/<device_id>  (扩展轮询循环)      │
       │ ─────────────────────────────────────────────────────►│
       │ 200 { code:0, data:{ status:"pending" | "done" | "error", ... } }
       │ ◄─────────────────────────────────────────────────────│
       │                                                        │
       │ 轮询到 status=="done":本地存 access_token + user 信息  │
       │ 轮询到 status=="error":展示错误,清理 device_id        │
       │ 10 分钟内未 done:超时,清理 device_id                   │
```

关键约束:

- **回调请求只在 options 页发起**,不能放 content script。邮件链接
  `chrome-extension://<id>/options.html#...` 由浏览器内核直接打开 options 页,
  SPA 在 `#/login/magic` 路由里发起 POST。
- **扩展域没有浏览器域 cookie**。不要依赖 `Set-Cookie: refresh_token`,
  只从 JSON body 的 `access_token` / `refresh_token` 取。
- **device_id 由扩展侧生成**(`crypto.randomUUID()` 或 16+ 字节随机串),
  同一用户在多台设备上要生成不同的 device_id,避免槽位撞车。

---

## 2. 三个端点

### 2.1 申请魔法登录邮件

```
POST /v3/email/magic-login
Content-Type: application/json

{ "email": "<user@x>", "mode": "nomu", "device_id": "<ext-generated-id>" }
```

- `mode` 必须为 `"nomu"`,后端用 `binding:"required,oneof=blog nomu"` 拦截非法值。
- `device_id` 仅 nomu 模式生效,后端据此建立 `nomulogin:device:<device_id>` 轮询槽位。
- 该端点**永远返回 200**(防 enumeration)。即使邮箱未注册,扩展也只会收到
  `"若该邮箱已注册,登录链接已发送"`,不要用响应判断邮箱是否存在。
- 失败:邮箱格式非法 → 400;`mode` 缺失或非 `blog|nomu` → 400。

### 2.2 回调转发(由 SPA 在 options 页里发起,扩展本身不直接调用)

```
POST /v3/nomu/magic-login
Content-Type: application/json

{ "token": "<64-hex>:nomu", "mode": "nomu" }
```

- `token` 形如 `<64-hex>:nomu`,hex 段是 64 位十六进制(32 字节),`mode` 段固定 `nomu`。
- `mode` 必须为 `"nomu"`,后端用 `oneof=blog nomu` 拦截。
- 该端点由前端 SPA(`NomuLoginView.vue`)在 hash 路由里调用,**扩展侧无需自己
  实现这个请求**。扩展只负责 ① 申请邮件、③ 轮询槽位。
- 失败:token 格式非法 / 已过期 / 已消费 → 401 `invalid magic token`;
  用户被删除 → 404。

### 2.3 轮询槽位(扩展唯一需要主动调用的端点)

```
GET /v3/nomu/login/<device_id>
```

- 公开端点,不需要任何鉴权头(`device_id` 本身是 slot 的临时 key,泄漏不影响其他用户)。
- 响应统一 200(连 `error` 状态也返 200,扩展只读 `data.status` 判断):

  ```json
  { "code": 0, "msg": "ok",
    "data": {
      "status": "pending",
      "access_token": "...",   // 仅 done
      "refresh_token": "...",  // 仅 done
      "user": { /* UserInfo */ }, // 仅 done
      "error": "..."           // 仅 error
    } }
  ```

- `status` 字段:
  - `"pending"`:槽位存在但回调尚未落地(或槽位不存在,后端统一返 pending,
    防"申请邮件"与"回调落地"之间扩展抢跑)。
  - `"done"`:回调已确认,带 `access_token` / `refresh_token` / `user`,扩展收尾。
  - `"error"`:极少数情况下后端写槽位失败(目前未触发,扩展若收到可提示用户重试)。
- 只有真正的服务端异常(redis 不可用等)才返 5xx。

---

## 3. Token 与槽位细节

扩展**不直接接触**这些 key,但需要知道这些边界条件以判断超时与重试:

| 项 | 值 |
| --- | --- |
| token 形态 | `<64-hex>:<mode>`,hex 段 64 位,`mode` ∈ `blog\|nomu` |
| token TTL | **10 分钟**,邮件发出后开始计时 |
| token 一次性 | 回调转发时 `GetDel` 取走,二次消费直接 401 |
| 槽位 TTL | `nomulogin:device:<device_id>` 也是 10 分钟 |
| hex→device 反向映射 | `nomulogin:hex:<hex>` 回调成功即清 |

意味着:

- 用户点邮件链接的窗口是 10 分钟。超过 10 分钟 token 过期、槽位过期,扩展的轮询
  持续返 `pending` 直到扩展侧超时。
- 同一个邮箱短时间内重复点邮件,会生成多个 token,只有最新一次回调能成功(前序的
  `magiclogintoken` 仍 10 分钟有效,会被先点的那次消费掉)。
- 同一个 device_id 二次申请邮件会**覆盖**槽位为 `pending`,前一次未消费的 `done`
  结果会被丢弃。扩展侧若 UI 上允许"换一封邮件",应重新生成 device_id。

---

## 4. 扩展侧 manifest 与 options 路由

`manifest.json` 关键片段:

```json
{
  "manifest_version": 3,
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "permissions": ["storage", "identity"],
  "host_permissions": [
    "https://kanocifer.chat/*",
    "https://api.kanocifer.chat/*"
  ]
}
```

`options.html` 用 hash 路由,`#/login/magic` 由前端 SPA(`NomuLoginView.vue`)渲染:

```
GET chrome-extension://<extension-id>/options.html#/login/magic?token=<hex>:nomu
```

邮件里给出的链接是 `<host>/options.html#/login/magic?token=<hex>:nomu`,其中 `<host>`
是后端配置的 nomu frontend host(生产为 `https://kanocifer.chat`)。邮件客户端点开时
Chrome 把 host 替换为 `chrome-extension://<id>`,落进 options 页。

扩展侧唯一需要的额外文件:在 options 页 hash 路由里挂一个 `/login/magic` 的简单容器,
把 `location.hash` 的 `?token=...` 转给前端 SPA(`NomuLoginView.vue` 已自动读 query
+ 调 `forwardNomuMagicLink`)。

---

## 5. 推荐轮询策略(三段指数退避 + 10 分钟超时)

```ts
const POLL_BACKOFF_MS = [300, 1000, 3000] as const; // 重复使用
const POLL_TIMEOUT_MS = 10 * 60 * 1000;             // 与后端槽位 TTL 对齐

async function waitForLogin(deviceId: string): Promise<NomuLoginState> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const res = await authGateway.pollNomuLogin(deviceId);
    const state = res.data;

    if (state.status === 'done') return state;
    if (state.status === 'error') return state;

    // pending → 退避后继续轮询
    await sleep(POLL_BACKOFF_MS[attempt % POLL_BACKOFF_MS.length]);
    attempt++;
  }

  // 超时:返回哨兵,扩展 UI 提示用户重新申请邮件
  return { status: 'error', error: 'polling timeout' };
}
```

要点:

- 300ms → 1s → 3s 三段轮转,**不要固定间隔**。前端用 `setTimeout` 容易在 callback
  页面 background throttle 下被拉长,但扩展 options 页在前台、且 fetch 是即时
  返回的,300ms/1s/3s 已是合理的退避档位,既不抢后端也不让用户等太久。
- **10 分钟超时**与后端槽位 TTL 对齐。超过这个时间即便再轮询也只能拿到 `pending`。
- **不要无限重试**。一次会话申请一次邮件,失败就让用户重新发起,避免 slot 长期占用。
- 拿到 `status: 'done'` 后**立刻停止轮询**,扩展侧自行把 `access_token` /
  `refresh_token` 存进 `chrome.storage.local` 并跳到登录态。
- `status: 'error'` 也要停止轮询(扩展侧只在自己生成的 device_id 上轮询,
  `error` 极少触发)。

---

## 6. 拿到 token 之后怎么用

`access_token` 和 `refresh_token` 都是 JWT(HS256,24h/7d,见 `docs/rules/auth.md`),
扩展侧把它当 bearer token 用即可。

### 6.1 调用 v3 接口

```ts
const res = await fetch('https://api.kanocifer.chat/v3/me', {
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

请求头格式与前端 SPA / 移动端一致,**没有特殊 extension header**。

### 6.2 静默刷新

access token 过期后用 refresh token 换新的:

```ts
POST /v3/refresh-token
Content-Type: application/json

{ "refresh_token": "<jwt>" }
```

响应:

```json
{ "code": 0, "data": { "access_token": "...", "refresh_token": "..." } }
```

后端会用 `redis.set("refresh:<user_id>", new_refresh_jwt, ex=7d)` 覆盖旧值
(单设备模型,见 `docs/rules/auth.md`)。

> 扩展侧不能依赖 `Set-Cookie: refresh_token`,因为 `chrome-extension://`
> 域不是浏览器认可的 cookie host(`Set-Cookie` 会被 Chrome 丢弃)。
> 直接从 JSON body 取 refresh token,存 `chrome.storage.local`,自己管理轮换。

### 6.3 登出

```ts
POST /v3/logout
Authorization: Bearer <access_token>
```

后端会 `redis.delete("refresh:<user_id>")`。扩展侧记得清本地 `chrome.storage`。

---

## 7. 与前端代码同步时的核对点

frontend 仓库里:

- `packages/api/src/gateways/auth.ts`:`authGateway.requestMagicLink({email, mode:'nomu', device_id})`
  / `authGateway.pollNomuLogin(device_id)` / `NomuLoginState` 类型与本文档 §2 字段一致。
- `apps/vue-app/src/features/noontool/NomuLoginView.vue`:SPA 回调页,只负责转发 token,
  不写会话态、不带 device_id、不轮询——扩展侧的轮询是扩展自己的事。
- `apps/vue-app/src/router/index.ts`:`/nomu/login` 路由指向 `NomuLoginView.vue`。

扩展侧唯一**直接对接后端**的端点是 §2.1 与 §2.3。`NomuLoginView` 已经在 SPA 里
代发了 §2.2,扩展不要重复实现。

---

## 8. 错误码速查

| 场景 | HTTP | 后端 `msg` / `data.status` | 扩展处理 |
| --- | --- | --- | --- |
| 申请邮件,邮箱未注册 | 200 | `若该邮箱已注册,登录链接已发送` | 提示"请查收邮件",**不判断邮箱是否存在** |
| 申请邮件,邮箱格式非法 | 400 | `invalid request body` | UI 校验邮箱 |
| 申请邮件,`mode` 非 blog/nomu | 400 | `binding oneof 报错` | 自身 bug,不该出现 |
| 回调转发,token 不存在 / 已用 | 401 | `invalid magic token` | UI 提示"链接已过期,请重新申请" |
| 回调转发,用户被删除 | 404 | `用户不存在` | 极少见,UI 提示重试 |
| 轮询,槽位 pending | 200 | `data.status == "pending"` | 继续轮询 |
| 轮询,回调已确认 | 200 | `data.status == "done"` | 取 token 存本地 |
| 轮询,后端写槽位失败 | 200 | `data.status == "error"` | 提示用户重试 |
| 任意端点,服务端异常 | 500 | `server error` | 提示用户稍后重试 |

---

## 9. 不需要做也不要做的事

- 不要在扩展 content script 里发起 §2.1 / §2.3 请求。CORS 与 `chrome-extension://`
  origin 限制会让请求失败,而且也不必要。
- 不要在扩展里保存 `Set-Cookie` 拿到的 refresh token(拿不到——`chrome-extension://`
  不收第三方 cookie)。
- 不要在多个 tab / 多次申请之间复用 device_id。一次申请用一个 device_id,失败或
  超时就丢弃。
- 不要把 access_token 写进 `chrome.storage.sync`——只放 `chrome.storage.local`,
  同步存储空间小 + 跨设备同步会扩散 token。
- 不要在扩展里复刻后端 token 校验(token 是后端 `GetDel` 一次性消费的,扩展重试
  不会让它复活)。