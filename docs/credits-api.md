# AI 积分系统 · 前端调用文档

AI 服务（生图、翻译、提示词优化）已接入统一积分体系：每次调用按固定单价扣费，余额不足直接拒单。本文档面向前端开发者，覆盖计费规则、接口契约、错误处理与幂等键用法。

## 1. 通用约定

### 认证

所有计费接口与积分查询接口均要求登录，Header 携带 JWT：

```
Authorization: Bearer <access_token>
```

未登录或 token 失效：go-backend（`/v3`）返回 401 + `{"error": "..."}`；py-backend（`/v2`）返回 401 + `{"message": "...", "data": null}`。**两端信封形状不同，401 判断以 HTTP 状态码为准，不要解析 message 文案。**

> 变更提示：`/v2/translate` 与 `/v2/nomu/prompt-optimize` 原支持匿名调用，现已强制登录。所有调用处必须带 token。

### 响应信封

成功响应统一为 `{ "data": ..., "message": ... }`，HTTP 状态码 200。下文响应示例仅展示 `data` 内部结构。

### 金额单位

- 所有积分数值（余额、扣费、发放）对外单位为「分」，JSON 数字，两位小数（如 `30` = 30 分，`0.1` = 0.1 分）。
- 展示时直接渲染即可，无需前端再做单位换算。

## 2. 计费规则

| 服务 | 接口 | source | 单价 | 扣费方式 |
|---|---|---|---|---|
| 通用翻译 | `POST /v2/translate` | `translate` | 0.1 分/次 | 每次调用固定 |
| 提示词优化 | `POST /v2/nomu/prompt-optimize` | `nomu_prompt_optimize` | 0.2 分/次 | 每次调用固定 |
| 生图（lite 档） | `POST /v3/design/generate` | `design_generate` | 30 分/张 | 按实际出图张数 |
| 生图（pro 档） | `POST /v3/design/generate` | `design_generate` | 40 分/张 | 按实际出图张数 |
| 生图（apiyi gpt-image-2-all） | `POST /v3/design/generate` | `design_generate` | 30 分/张 | 按实际出图张数 |

生图的计价档位为**命名空间化 variant**：`<服务商>:<模型/档位>`，即 `ark:seedream-5.0` / `ark:seedream-5.0-pro` / `apiyi:gpt-image-2-all` / `apiyi:gpt-image-2.5-all`。每个上游模型独立成档，可单独调价（改 `credit_price` 表对应行的 `unit_price`）。旧命名（`lite` / `pro` / `apiyi`）的历史行保留不清理，新代码只写新命名。

失败一律不扣费：上游报错、进程内异常、客户端断连均全额退还本次预扣（退还成功后 `credits_spent` 字段不回填，用户实际净扣 0）。

生图特别说明：出图张数由模型响应决定（单次调用可能返回多张），请求体没有「张数」参数。计费时序为——预扣 1 张作余额闸门（余额不足 30/40 分直接 402，不调模型）→ 响应后按实际张数结算，多张补扣差额。**补扣可能把余额扣成负数**（图已生成，成本已发生），负余额用户的下一次调用会被 402 拦截，先欠后还。

## 3. 幂等键（Idempotency-Key）

计费接口支持可选请求头 `Idempotency-Key`，用于防止超时重试导致重复扣费：

```
Idempotency-Key: <客户端生成的唯一字符串>
```

- **同一次用户操作**只生成一个 key；网络超时后重试请求时**复用同一个 key**。重复请求不会双扣，接口按首次请求的计费记录正常处理。
- 不传则由服务端生成随机键，仅保证单次请求内部幂等——重试会再次扣费。
- key 约束：长度 ≤ 57 字符，不得以 `refund:` 或 `settle:` 开头，违反返回 400。
- 生图、翻译、提示词优化三个计费接口均接受此头。

## 4. 计费接口

### POST /v2/translate

请求体：

```json
{ "text": "待翻译文本", "targetLanguage": "日语" }
```

响应 `data`：

```json
{
  "text": "翻訳結果",
  "usage": { "model": "...", "input_tokens": 100, "output_tokens": 50, "total_tokens": 150, "duration_ms": 1200 },
  "credits_spent": 0.1
}
```

`credits_spent` 为本次实扣（分）。另有按 IP 限流 20 次/分钟，超出 429。

### POST /v2/nomu/prompt-optimize

请求体 `{ "prompt": "原始提示词" }`；响应 `data` 含 `prompt`（优化结果）、`usage`、`credits_spent`（0.2）。限流同 translate。

### POST /v3/design/generate

请求体：

```json
{
  "prompt": "画面描述（必填）",
  "model": "Doubao-Seedream-5.0-lite | Doubao-Seedream-5.0-pro | gpt-image-2-all | gpt-image-2.5-all（缺省用 DESIGN_PROVIDER 的默认档）",
  "size": "上游尺寸，可选，如 1K / 2K / 宽x高",
  "images": ["可选参考图 URL 或 data URL，图生图时传"]
}
```

响应 `data`：

```json
{
  "model": "doubao-seedream-5-0-260128",
  "images": [ { "index": 0, "size": "2048x2048", "url": "/v3/media/design/..." } ],
  "usage": { "generated_images": 1, "output_tokens": 16280, "total_tokens": 16280 },
  "created": 1784696685
}
```

`images[].url` 为本站同源媒体地址（已落盘，不过期）。同步长任务：上游生图典型 30–60s，出站超时兜底 360s；中间层（反向代理/网关/Serverless 执行上限）也必须放宽到 ≥360s，任一层小于生成时间都会掐断请求。**重试务必携带首次请求的 `Idempotency-Key`。**

服务商由请求的 `model` 自动路由：`gpt-image-*` → apiyi，`Doubao-*` → 方舟，两个服务商同时可用，无需切配置。`model` 缺省时用 `DESIGN_PROVIDER`（默认 `ark`）。apiyi 走 OpenAI 兼容协议——无参考图 `POST /v1/images/generations`，有参考图 `POST /v1/images/edits`（multipart，`image` 可重复）。apiyi 密钥读环境变量 `APIYI_API_KEY`，base_url `https://api.apiyi.com/v1`（可被 `APIYI_BASE_URL` 覆盖），均不硬编码。

apiyi 参数红线：请求**不带** `size` / `quality` / `n` / `aspect_ratio`（会被忽略甚至触发校验错误；`n=3` 按 3 张计费却只回 1 张）。输出尺寸靠 prompt 前缀控制，如开头写「横版 16:9」。`response_format` 由服务端显式下发（默认 `b64_json`），不依赖上游默认值；`b64_json` 与 `url` 在 `data[]` 中二选一，两者都兜住。参考图 >1.5MB 才压缩：长边等比缩到 2048px 内（不放大小图）、质量 0.9 原格式重编码；多图合计 ≤6MB，单图 ≤10MB；压缩失败回退原图继续。

## 5. 积分查询接口

### GET /v3/credits/balance

需登录。响应 `data`：

```json
{ "balance": 29.9, "total_spent": 0.1 }
```

从未消费过的用户返回 `0`，不是 404。建议：计费操作前拉一次余额做 UI 预判（如按钮置灰），但以服务端 402 为最终裁判（余额可被并发消耗）。

### GET /v3/credits/transactions

需登录。查询参数 `page`（缺省 1）、`per_page`（缺省 10，上限 200）。响应 `data`：

```json
{
  "items": [
    {
      "id": 12, "source": "design_generate", "biz_id": "uuid-or-client-key",
      "type": "consume", "amount": -30, "balance_after": 0,
      "meta": { "variant": "ark:seedream-5.0", "qty": 1 }, "created_at": "2026-09-07T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "per_page": 10, "total": 12, "pages": 2, "has_prev": false, "has_next": true, "prev_num": null, "next_num": 2 }
}
```

- `type`：`consume`（消费，amount 为负）、`refund`（退款，正）、`grant`（管理员发放，正）。
- 按时间倒序。一笔消费可能伴随一条 `source` 相同的 `refund`/补扣记录（结算差额），展示「净消耗」时用 `balance_after` 更可靠。

## 6. 错误处理

计费接口统一错误语义（两端一致，HTTP 状态码为准）：

| 状态码 | 含义 | 前端处理建议 |
|---|---|---|
| 400 | 请求体非法 / `Idempotency-Key` 非法（超长或保留前缀） | 修正参数；不是余额问题 |
| 401 | 未登录 / token 失效 | 走统一刷新 token 或重新登录流程 |
| 402 | **余额不足** | 提示积分不足并引导获取积分（当前仅管理员发放，引导文案如「联系管理员充值」）；可在弹窗中附带 `GET /v3/credits/balance` 的余额 |
| 429 | IP 限流（仅 py `/v2` 两接口） | 提示操作过快，稍后重试；与积分无关 |
| 500 | 服务端错误（含计费配置异常） | 通用错误提示；扣费不会生效（预扣随事务回滚） |
| 502 | 上游模型服务错误（仅生图） | 提示稍后重试；本次预扣已全额退还，重试**必须换一个新的 `Idempotency-Key`**——旧 key 的扣费已退，复用会命中该记录导致本次不扣费（详见下方重试策略） |

重试策略速查：

- **超时/网络中断**（不知道服务端是否已扣费）：**复用同一 `Idempotency-Key` 重试**——服务端已扣则不双扣，未扣则正常扣，安全。
- **明确收到失败响应**（502/500，本次扣费已原路退还）：用**新的 key** 发起重试；复用旧 key 会命中已退款的记录，导致本次调用不计费（已知服务端取舍，前端不要依赖）。
- 收到 402/400/429：重试无意义，先解决对应问题。

## 7. 已知边界

- 余额不足判定以「1 张闸门」为准（生图），出多张后补扣成负是预期行为，UI 允许显示负余额并提示欠费。
- 同一 `Idempotency-Key` 在首次请求**成功交付后**，重放请求会再次执行模型调用但不再扣费（计费幂等），属已知取舍；前端按正常请求处理即可，不必依赖此行为。
- 积分永不过期；管理员发放为第一期唯一入账渠道。
