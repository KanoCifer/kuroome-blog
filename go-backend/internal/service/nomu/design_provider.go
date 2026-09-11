package nomu

import (
	"fmt"
	"maps"
	"slices"
	"strings"

	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// Protocol 出图服务商的协议形态，决定组包与端点选择。
type Protocol string

const (
	// ProtocolArk 火山方舟 images/generations：图片以 image 字段内嵌在 JSON 里，
	// 文生图与图生图同一端点。
	ProtocolArk Protocol = "ark"
	// ProtocolOpenAI OpenAI 兼容形态：文生图 POST /images/generations（JSON），
	// 图片编辑 POST /images/edits（multipart，image 可重复）。禁传 size/quality/n/aspect_ratio。
	ProtocolOpenAI Protocol = "openai"
)

// Provider 一个出图服务商的接入参数：协议、端点、鉴权、模型目录。
//
// 换服务商 = 换这份值。协议相同的官方直连与中转只是 Endpoint / APIKey /
// Models 不同，DesignService 编排不变；异构协议走 Protocol 分派组包/端点。
type Provider struct {
	// Name 服务商标识，用于日志与配置选择（如 "ark" / "apiyi"）。
	Name string
	// Protocol 协议形态，决定组包与端点。
	Protocol Protocol
	// Endpoint images/generations 完整 URL（含路径）。
	Endpoint string
	// EditsURL images/edits 完整 URL；仅 ProtocolOpenAI 使用（图片编辑走 multipart）。
	EditsURL string
	// APIKey 上游密钥。
	APIKey string
	// AuthScheme Authorization 头的方案前缀，默认 "Bearer"。
	AuthScheme string
	// Models 面向用户的展示名 → 上游模型 ID + 计费档位。
	Models map[string]ModelSpec
	// DefaultModel Models 的 key，Model 为空时的兜底（应为成本低档）。
	DefaultModel string
	// ResponseFormat 显式下发的 response_format（"b64_json" / "url"）。
	// 不依赖上游默认值——默认行为随分组与负载变化过。
	ResponseFormat string
}

// ModelSpec 上游模型 ID 与 credit_price.variant 计费档位。
type ModelSpec struct {
	ID      string // 上游模型 ID
	Variant string // 计费档位，对齐 credit_price.variant
}

// arkEndpoint 火山方舟图片生成端点（doubao-seedream 系列）。
const arkEndpoint = "https://ark.cn-beijing.volces.com/api/v3/images/generations"

// arkModels 面向用户的展示名 → 方舟模型 ID + 计费档位。直接传 ID 也接受。
var arkModels = map[string]ModelSpec{
	"Doubao-Seedream-5.0-pro":  {ID: "doubao-seedream-5-0-pro-260628", Variant: model.DesignVariantArkPro},
	"Doubao-Seedream-5.0-lite": {ID: "doubao-seedream-5-0-260128", Variant: model.DesignVariantArkLite},
}

// DefaultProvider 以方舟官方参数为底，用非空入参覆盖传输参数。
// apiKey 必填；endpoint / authScheme 为空时回退方舟默认，支持同协议中转
// 仅靠配置切换（DESIGN_BASE_URL / DESIGN_AUTH_SCHEME）。
// ponytail: 模型目录仍编译在 Go。换到模型 ID 不同的服务商需在此加一份
// arkModels 同构的目录；升级路径=把目录改成配置注入。
func DefaultProvider(apiKey, endpoint, authScheme string) Provider {
	if endpoint == "" {
		endpoint = arkEndpoint
	}
	if authScheme == "" {
		authScheme = "Bearer"
	}
	return Provider{
		Name:           "ark",
		Protocol:       ProtocolArk,
		Endpoint:       endpoint,
		APIKey:         apiKey,
		AuthScheme:     authScheme,
		Models:         arkModels,
		DefaultModel:   "Doubao-Seedream-5.0-lite",
		ResponseFormat: "", // 方舟响应自带 url，无需下发
	}
}

// apiyiBaseURL apiyi（gpt-image-2-all）默认根地址，images/* 挂在其下。
const apiyiBaseURL = "https://api.apiyi.com/v1"

// apiyiModels gpt-image-2-all / gpt-image-2.5-all。两名等价、当前同价
// （$0.03/张），但各占独立命名空间档位，可分别调价。
var apiyiModels = map[string]ModelSpec{
	"gpt-image-2-all":   {ID: "gpt-image-2-all", Variant: model.DesignVariantApiyiGptImage2All},
	"gpt-image-2.5-all": {ID: "gpt-image-2.5-all", Variant: model.DesignVariantApiyiGptImage25All},
}

// ApiyiProvider 构造 apiyi（gpt-image-2-all）服务商参数。
// baseURL 为空时用 apiyiBaseURL；密钥来自 APIYI_API_KEY，不硬编码。
// response_format 固定显式下发 "b64_json"（默认），避免依赖随负载漂移的默认值；
// 单次请求可用 GenerateRequest.ResponseFormat 覆盖为 "url"。
func ApiyiProvider(apiKey, baseURL string) Provider {
	if baseURL == "" {
		baseURL = apiyiBaseURL
	}
	baseURL = strings.TrimRight(baseURL, "/")
	return Provider{
		Name:           "apiyi",
		Protocol:       ProtocolOpenAI,
		Endpoint:       baseURL + "/images/generations",
		EditsURL:       baseURL + "/images/edits",
		APIKey:         apiKey,
		AuthScheme:     "Bearer",
		Models:         apiyiModels,
		DefaultModel:   "gpt-image-2-all",
		ResponseFormat: "b64_json",
	}
}

// resolveModel 把展示名或上游模型 ID 归一为 ModelSpec（ID + 计费档位）。
func (p Provider) resolveModel(name string) (ModelSpec, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return p.Models[p.DefaultModel], nil
	}
	if spec, ok := p.Models[name]; ok {
		return spec, nil
	}
	for _, spec := range p.Models {
		if spec.ID == name {
			return spec, nil
		}
	}
	return ModelSpec{}, fmt.Errorf("%w: %q (supported: %s)", ErrUnknownModel,
		name, strings.Join(slices.Sorted(maps.Keys(p.Models)), ", "))
}

// Router 已注册服务商集合，按模型名把请求路由到对应服务商。
//
// 路由维度是「模型」：模型展示名或上游 ID 出现在哪个 Provider.Models，请求就
// 发给谁——换服务商由前端传 model 决定，不再只靠 DESIGN_PROVIDER 静态选择
// （该配置退化为「model 为空时的默认服务商」）。跨服务商模型名冲突以先注册者为准。
type Router struct {
	providers []Provider
	def       string // 默认服务商名（model 为空时用）
}

// NewRouter 按注册顺序构造 Router；defaultProvider 未注册时回退首个服务商。
func NewRouter(defaultProvider string, providers ...Provider) *Router {
	r := &Router{providers: providers, def: defaultProvider}
	if _, ok := r.get(defaultProvider); !ok && len(providers) > 0 {
		r.def = providers[0].Name
	}
	return r
}

// Single 单服务商 Router（测试 / 只接一个上游的部署）。
func Single(p Provider) *Router { return NewRouter(p.Name, p) }

// Providers 按注册顺序返回服务商（service 据此为每个服务商建客户端）。
func (r *Router) Providers() []Provider { return r.providers }

func (r *Router) get(name string) (Provider, bool) {
	for _, p := range r.providers {
		if p.Name == name {
			return p, true
		}
	}
	return Provider{}, false
}

// Resolve 把模型名路由到 (服务商, 模型规格)。空名走默认服务商的默认模型。
func (r *Router) Resolve(modelName string) (Provider, ModelSpec, error) {
	if len(r.providers) == 0 {
		return Provider{}, ModelSpec{}, fmt.Errorf("%w: no provider registered", ErrUnknownModel)
	}
	if strings.TrimSpace(modelName) == "" {
		p, _ := r.get(r.def)
		spec, err := p.resolveModel("")
		return p, spec, err
	}
	for _, p := range r.providers {
		if spec, err := p.resolveModel(modelName); err == nil {
			return p, spec, nil
		}
	}
	return Provider{}, ModelSpec{}, fmt.Errorf("%w: %q (supported: %s)",
		ErrUnknownModel, modelName, strings.Join(r.supported(), ", "))
}

// supported 汇总所有服务商的模型名，用于未知模型的报错提示。
func (r *Router) supported() []string {
	var names []string
	for _, p := range r.providers {
		for name := range p.Models {
			names = append(names, name)
		}
	}
	slices.Sort(names)
	return names
}
