export default {
  noonTool: {
    meta: {
      title: 'Nomu：一款易用的 Chrome 扩展',
      description:
        'Nomu 是一款 Chrome 浏览器扩展，帮你从 1688、淘宝/天猫、京东采集商品，自动整理标题、价格和图片，翻译成英文和阿拉伯语，再逐件发布到 Noon 阿联酋和沙特站。多店铺集中管理、任务面板、店铺间复制与 AI 类目推荐内置其中；店铺设置默认保存在本地。',
      keywords: ['Nomu', '1688', '淘宝上架', '京东上架', 'Noon 上架', 'Noon UAE', 'Noon Saudi', '浏览器扩展'],
    },
    hero: {
      eyebrow: 'Nomu · Chrome 浏览器扩展',
      headline: '一款易用的',
      headlineTail: 'Noon Chrome 插件',
      subheadline:
        '还是熟悉的采购页面，还是你自己的 Noon 店铺。Nomu 把采集、翻译、图片处理和逐件发布收进同一条流水线：从源页到已上架，黄色高亮逐条确认。',
      ctaPrimary: '添加到 Chrome',
      ctaPrimaryHint: '跳转到 Chrome 网上应用商店，一键安装 Nomu',
      ctaSecondary: '看看它做什么',
      ctaDocs: '查看文档',
      localeZh: '中文',
      localeEn: 'EN',
      pipeline: {
        capture: '采集',
        translate: '翻译',
        image: '图片',
        category: '类目',
        publish: '发布',
      },
      screenshotAlt: 'Nomu 主界面截图',
      screenshotCaption: '功能示意',
    },
    splash: {
      eyebrow: 'Nomu',
    },
    positioning: {
      claim1: '默认数据留在本地',
      claim2: '不收密钥 · 不埋点',
      claim3: '多店铺来源一站搞定',
      claim4: '逐件发布 · 出错即停',
    },
    features: {
      eyebrow: '功能',
      sectionTitle: '采集商品，剩下的交给插件。',
      sectionSubtitle:
        '每一步都有默认值：翻译自动出、图片自动合规、AI 类目推荐。你只需要在黄色高亮处点一下确认——之后的进度、失败和重试都有人盯着。',
      items: {
        pipeline: {
          title: '把源页商品发到 Noon',
          imageAlt: '采集到发布全流程的截图',
          body: '采集源页、加入待发布列表、提交上架、激活并登记质保，一次走完。',
        },
        multiAccount: {
          title: '店铺集中管理',
          imageAlt: '侧栏多店铺列表与切换的截图',
          body: '在同一个面板里管理多家 Noon 店铺，切换店铺时自动填好上架设置。',
        },
        translate: {
          title: '中译英 / 阿 自动翻译',
          imageAlt: '翻译结果的截图',
          body: '标题、卖点与商品属性自动翻译，覆盖阿联酋与沙特两个站点。',
        },
        image: {
          title: '图片自动处理成可上架',
          imageAlt: '商品图按 660×900 规格处理的截图',
          body: '商品图自动调整为 Noon 要求的尺寸和白底（660×900），规格不对的图片会被处理到位，不会让上架被卡。',
        },
        serial: {
          title: '逐件发布，出错即停',
          imageAlt: '逐件独立发布的商品截图',
          body: '每件商品独立发布。第一件失败就停止整个批次，不会留下一半上架、一半漏发的乱摊子。',
        },
        category: {
          title: '自动推荐 Noon 类目',
          imageAlt: '自动推荐的 Noon 类目截图',
          body: '根据源页信息自动推荐 Noon 类目，不用手动挑选。',
        },
        sources: {
          title: '采集源不止 1688',
          imageAlt: '从不同源站采集商品的截图',
          body: '1688、淘宝/天猫、京东商品页可直接采集，noon.com 商品页也能作为源；其它站点可按需临时采集，不用等新版本。',
        },
        tasks: {
          title: '任务面板盯全程',
          imageAlt: '任务面板列出上架与复制任务的截图',
          body: '上架与复制任务集中在一个面板：进度、每一步耗时、失败原因都在行内展开，失败的可以单独重试。',
        },
        duplicate: {
          title: '店铺之间复制商品',
          imageAlt: '批量复制商品到另一店铺的截图',
          body: '把已有商品复制到自己名下另一家店铺，PartnerSKU、条码和品牌可批量改写，复制走独立队列，不占上架通道。',
        },
        engine: {
          title: '并发与重试自己定',
          imageAlt: '任务引擎并发与重试设置截图',
          body: '上架与复制各自配置并发数和失败自动重试上限，默认保守；改完立即生效，不用重启浏览器。',
        },
        price: {
          title: '人民币价格自动换算',
          imageAlt: '汇率换算后填入价格的截图',
          body: '源页价格按实时汇率换算成店铺币种，填入时同时保留人民币对照，报价不用再切计算器。',
        },
        export: {
          title: '商品表可导出',
          imageAlt: '导出 SKU 到表格的截图',
          body: '待发布清单可导出成 Excel 表格，用来对账或交给同事，不必在网页上一条条抄。',
        },
        account: {
          title: '免密码登录',
          imageAlt: '邮箱魔法链接登录界面截图',
          body: '用邮箱收一封登录链接即可，不用记密码；登录态跟着账号走，换台电脑不用重新配置店铺。',
        },
        cloudPool: {
          title: '采集结果多设备流转',
          imageAlt: '云端共享池里领取采集结果的截图',
          body: '采集好的商品可以推到云端池，同账号的其它设备实时可见，一键领取到本地继续上架。',
        },
        sync: {
          title: '配置多机同步',
          imageAlt: '上传与下载云端配置的截图',
          body: '店铺配置可以上传到云端、在另一台电脑上拉回来，换设备不用把设置再填一遍。',
        },
        assistant: {
          title: 'AI 助手与右键解析',
          imageAlt: '在页面上向 AI 助手提问的截图',
          body: '上架规则可以直接问内置的 AI 助手；遇到没适配的页面，右键「用 AI 解析」就能把商品信息转成草稿。',
        },
      },
      placeholder: {
        caption: '截图待补',
      },
    },
    how: {
      eyebrow: '工作流程',
      sectionTitle: '快速上架',
      imageAlt: '采集、确认、发布三步流程的截图',
      steps: {
        capture: {
          title: '在商品页一键采集',
          body: '打开 1688、淘宝/天猫、京东或 noon.com 的商品页，扩展会自动把商品信息加入待发布列表。',
        },
        confirm: {
          title: '逐条确认，黄色高亮',
          body: '右侧抽屉里逐条核对商品，价格、币种、翻译和类目都能在发布前调整。',
        },
        publish: {
          title: '逐件发布到 Noon',
          body: '提交商品、激活并登记质保；失败即停，可安全重试。',
        },
      },
    },
    audience: {
      motto: '为在 1688 / 淘宝 / 京东采购、在 Noon 阿联酋和沙特站上架的中文卖家而做',
    },
    privacy: {
      eyebrow: '隐私',
      sectionTitle: '你的隐私数据受到保护',
      sectionSubtitle:
        '扩展能接触你的店铺配置和每一次提交——这些数据该让你看清楚流向。云端共享池、配置同步与 AI 功能只在你主动使用时才上传数据。',
      colLocal: '默认留在本地',
      colEgress: '只发给 Noon',
      colNever: '永远不会看到',
      local: [
        '店铺设置（国家、合作方代码、仓库、数量、质保、品牌）',
        '店铺记录与当前使用的店铺',
        '商品批次草稿与任务记录',
      ],
      egress: ['商品信息（标题、描述、属性、价格、库存）', '商品图片（已处理为合规尺寸）', '质保、激活与复制请求'],
      never: [
        '你的 Noon 账号密码',
        '任何追踪、统计、埋点数据',
        '你的浏览历史或不相关网站的 Cookie',
        '未经你操作就上传的商品或配置',
      ],
    },
    permissions: {
      sectionTitle: '权限说明',
      sectionSubtitle: '几项核心权限；用到的网站列在下面',
      top: {
        activeTab: {
          name: '当前标签页',
          reason: '只在你点击扩展时读取当前页面，用来识别你正打开的商品页或店铺页。',
        },
        scripting: {
          name: '脚本注入',
          reason: '把采集与确认界面放进页面里；仅在匹配到的站点上运行。',
        },
        storage: {
          name: '本地存储',
          reason: '把你的店铺记录、设置与批次草稿保存在浏览器里。',
        },
      },
      fullTitle: '展开完整权限列表',
      full: {
        hostsTitle: '工具会用到的网站',
        permissions: {
          storage: {
            name: '本地存储',
            reason: '保存店铺记录、设置与批次草稿。',
          },
          alarms: {
            name: '定时任务',
            reason: '定时扫描待处理的上架与复制任务，浏览器重启后能自动续跑。',
          },
          notifications: {
            name: '通知',
            reason: '批次跑完或任务失败时提醒你，不用一直盯着页面。',
          },
          activeTab: {
            name: '当前标签页',
            reason: '只在你点击扩展时读取当前页面。',
          },
          scripting: {
            name: '脚本注入',
            reason: '把采集与确认界面放进页面里。',
          },
          contextMenus: {
            name: '右键菜单',
            reason: '添加「用 AI 解析」等右键入口。',
          },
        },
        hosts: {
          noonPartners: {
            name: 'Noon 合作方后台',
            reason: 'Noon 的合作方管理页面（商品目录），上架请求都发往这里',
          },
          noonCdn: {
            name: 'Noon 图片服务',
            reason: 'Noon 的图片与文件服务器',
          },
          alicdn: {
            name: '1688 / 淘宝图片服务',
            reason: '1688 与淘宝商品图片的服务器',
          },
          jdimg: {
            name: '京东图片服务',
            reason: '京东商品图片的服务器',
          },
          backend: {
            name: '扩展自带服务',
            reason: '负责翻译、图片处理与 AI 能力，不记录任何账号数据',
          },
        },
      },
    },
    faq: {
      sectionTitle: '常见疑问',
      items: {
        free: {
          q: 'Nomu 是免费的吗？',
          a: '工具本身免费使用。设置与登录信息（Cookie）都留在你自己的浏览器里，没有订阅费。',
        },
        apiKey: {
          q: '我需要提供任何密钥或登录授权吗？',
          a: '不需要。Nomu 通过你已登录的 Noon 会话（Cookie）直接操作，你完全不用输入密码或密钥。',
        },
        regions: {
          q: '支持哪些 Noon 站点？',
          a: '目前支持 Noon 阿联酋站和沙特站。其他站点没测过，暂不承诺。',
        },
        sources: {
          q: '除了 1688 还支持其它源吗？',
          a: '支持 1688、淘宝/天猫、京东的商品页，noon.com 商品页也能作为源；其它站点可以用右键「用 AI 解析」临时采集。',
        },
        data: {
          q: '我的数据存放在哪里？',
          a: '店铺配置、批次草稿和任务记录默认都存在本地浏览器。只有你主动使用云端共享池、配置同步或导出功能时，相关数据才会经扩展自带服务中转；这些功能都不需要也能正常上架。',
        },
        ai: {
          q: 'AI 功能要另外付费吗？',
          a: 'AI 助手、类目推荐和右键解析需要登录 Nomu 账户，按积分计费，用完了在账户页充值；采集、翻译、上架等主流程不需要登录。',
        },
        translation: {
          q: '翻译质量如何？是否需要二次校对？',
          a: '翻译自动完成（中译英 / 阿）。贵重或品牌商品建议发布前抽检一下，自动翻译不保证母语水平。',
        },
        failure: {
          q: '上架失败的商品会怎样？',
          a: '批量发布中第一件失败即停止；失败的商品会在列表中标出，可单独重试或手动修改后再发布。',
        },
      },
    },
    support: {
      eyebrow: '支持',
      sectionTitle: '遇到问题？',
      sectionSubtitle: '安装、采集、发布任何一步遇到问题，或者想提功能建议，都可以联系。',
      viewQr: '查看微信二维码',
      channels: {
        wechat: {
          title: '微信（推荐）',
          body: '扫码添加好友，备注「Nomu」。日常使用问题、功能建议都在这里聊。',
        },
        docs: {
          title: '先问助手，再查文档',
          body: '上架规则、字段要求可以直接问扩展内的 AI 助手；安装、更新与常见问题见文档站 nomu.kanocifer.chat/docs',
        },
      },
    },
    finalCta: {
      title: '让上架变得更简单',
      body: '采集、翻译、建图、发布、复制、盯任务，一个插件走完。',
      button: '添加到 Chrome',
      hint: '在 Chrome 网上应用商店一键安装 Nomu',
    },
    footer: {
      tagline: 'Nomu：一款易用的 Noon 平台插件',
      links: {
        privacy: '隐私',
        changelog: '更新日志',
        support: '获取支持',
        docs: '文档',
      },
      license: '保留所有权利',
    },
  },
  nomuLogin: {
    headlinePending: '欢迎回来',
    headlineSuccess: '登录已同步',
    headlineError: '无法继续',
    sublinePending: '正在和 Nomu 服务确认这次登录…',
    sublineSuccess: '现在可以回到 Nomu 扩展继续你的工作。',
    sublineFallbackError: 'Nomu 没有在有效时间内确认这个链接，可能已过期。',
    missingTokenError: '缺少 token，链接无效',
    closePage: '关闭此页',
    retry: '再试一次',
  },
} as const;
