export default {
  noonTool: {
    meta: {
      title: 'Nomu: an easy-to-use Chrome extension for Noon',
      description:
        'Nomu is a Chrome extension that captures products from 1688, Taobao/Tmall and JD, translates the details (Chinese to English and Arabic), prepares images, and publishes each product to Noon UAE and Saudi. Multi-store management, a task panel, store-to-store duplication and AI category suggestions are built in; store settings stay on your machine by default.',
      keywords: [
        'Nomu',
        '1688',
        'Taobao listing',
        'JD listing',
        'Noon listing',
        'Noon UAE',
        'Noon Saudi',
        'browser extension',
      ],
    },
    hero: {
      eyebrow: 'Nomu · Chrome extension',
      headline: 'An easy-to-use',
      headlineTail: 'Noon Chrome extension',
      subheadline:
        'Same sourcing pages you already browse, same Noon stores you already run. Capture, translation, image prep and per-item publishing run as one pipeline, from source page to listed product.',
      ctaPrimary: 'Add to Chrome',
      ctaPrimaryHint: 'Opens the Chrome Web Store listing for a one-click install of Nomu',
      ctaSecondary: 'See what it does',
      ctaDocs: 'Read the docs',
      localeZh: '中文',
      localeEn: 'EN',
      pipeline: {
        capture: 'Capture',
        translate: 'Translate',
        image: 'Image',
        category: 'Category',
        publish: 'Publish',
      },
      screenshotAlt: 'Nomu main interface screenshot',
      screenshotCaption: 'The drawer on the right, one confirmed product at a time',
    },
    splash: {
      eyebrow: 'Nomu',
    },
    positioning: {
      claim1: 'Local by default',
      claim2: 'No keys · No tracking',
      claim3: 'Many sources, many stores',
      claim4: 'Publishes one by one · Stops on the first failure',
    },
    features: {
      eyebrow: 'Features',
      sectionTitle: 'Capture products. The extension handles the rest.',
      sectionSubtitle:
        'Every step ships with a sensible default: automatic translation, compliant images and AI category suggestions. Your part is checking the highlights before anything goes out — progress, failures and retries are watched for you.',
      items: {
        pipeline: {
          title: 'Send source products to Noon',
          imageAlt: 'Screenshot of the one-click capture-to-publish flow',
          body: 'Capture the source page, add it to your batch, then submit for listing, activation and warranty registration in one flow.',
        },
        multiAccount: {
          title: 'Store management in one place',
          imageAlt: 'Screenshot of the multi-store list and switching in the side panel',
          body: 'Keep all your Noon stores in one panel and switch stores to auto-fill the listing settings.',
        },
        translate: {
          title: 'Auto-translate Chinese to English and Arabic',
          imageAlt: 'Screenshot of the translation result',
          body: 'Titles, selling points and attributes are translated automatically, covering both Noon UAE and Saudi.',
        },
        image: {
          title: 'Product images ready to publish',
          imageAlt: 'Screenshot of images being prepared to the 660×900 spec',
          body: "Images are resized onto white backgrounds at Noon's 660×900 spec automatically, so a bad image never blocks a listing.",
        },
        serial: {
          title: 'Publish one by one, stop on the first problem',
          imageAlt: 'Screenshot of independently published products',
          body: 'Each product publishes on its own. If one fails, the whole batch stops instead of leaving half-published listings behind.',
        },
        category: {
          title: 'Category suggested automatically',
          imageAlt: 'Screenshot of the suggested Noon category',
          body: "The Noon category is suggested from the source data, so you don't have to pick it by hand.",
        },
        sources: {
          title: 'More than 1688',
          imageAlt: 'Screenshot of capturing products from different sources',
          body: 'Capture from 1688, Taobao/Tmall, JD, and noon.com product pages; any other site can be captured on demand without waiting for a release.',
        },
        tasks: {
          title: 'A task panel for the whole run',
          imageAlt: 'Screenshot of the task panel listing publish and duplicate tasks',
          body: 'Publish and duplicate tasks live in one panel: progress, per-step timing and the failure reason expand inline, and failed items can be retried on their own.',
        },
        duplicate: {
          title: 'Copy products between stores',
          imageAlt: 'Screenshot of batch-copying products into another store',
          body: 'Copy existing products into another store you own, rewriting partner SKU, barcode and brand in batch. Duplication runs on its own queue, so it never competes with publishing.',
        },
        engine: {
          title: 'Concurrency and retries, your call',
          imageAlt: 'Screenshot of the engine concurrency and retry settings',
          body: 'Publishing and duplication each get their own concurrency and retry limits, conservative by default. Changes apply immediately, no browser restart.',
        },
        price: {
          title: 'CNY prices converted for you',
          imageAlt: 'Screenshot of a converted price filling the price field',
          body: 'Source prices are converted to your store currency at the live rate, shown alongside the CNY figure, so you can stop switching to a calculator.',
        },
        export: {
          title: 'Export your product table',
          imageAlt: 'Screenshot of SKU export to a spreadsheet',
          body: 'Export the pending list as an Excel sheet for reconciliation or to hand to a colleague, instead of copying rows off the page.',
        },
        account: {
          title: 'Passwordless sign-in',
          imageAlt: 'Screenshot of the email magic-link sign-in screen',
          body: 'Sign in with a link sent to your email — no password to remember. Your session follows the account, so a new computer does not mean re-configuring stores.',
        },
        cloudPool: {
          title: 'Move captures across devices',
          imageAlt: 'Screenshot of claiming a capture from the cloud pool',
          body: 'Push a finished capture to the cloud pool where your other devices see it live, and claim it back locally to keep publishing.',
        },
        sync: {
          title: 'Sync configs to another machine',
          imageAlt: 'Screenshot of uploading and downloading cloud configs',
          body: 'Upload store configs to the cloud and pull them back on another computer, so a new machine does not need every setting typed again.',
        },
        assistant: {
          title: 'AI assistant and right-click parsing',
          imageAlt: 'Screenshot of asking the AI assistant a question on the page',
          body: 'Ask the built-in AI assistant about listing rules directly, and on a page the tool has no adapter for, right-click to parse the product into a draft.',
        },
      },
      placeholder: {
        caption: 'screenshot to come',
      },
    },
    how: {
      eyebrow: 'Workflow',
      sectionTitle: 'Three steps to ship a batch',
      imageAlt: 'Screenshot of the three-step flow: capture, confirm, publish',
      steps: {
        capture: {
          title: 'Capture a product page',
          body: 'Open a product page on 1688, Taobao/Tmall, JD or noon.com; the extension pulls the details into your batch.',
        },
        confirm: {
          title: 'Confirm one highlighted row at a time',
          body: 'The drawer shows each product for review. Price, currency, translations and category can all be adjusted before anything is submitted.',
        },
        publish: {
          title: 'Publish each product to Noon',
          body: 'Submit the product, activate it and register the warranty. If something fails, the batch stops and you can retry safely.',
        },
      },
    },
    audience: {
      motto: 'Built for Chinese-speaking sellers sourcing on 1688, Taobao or JD, listing on Noon UAE and Saudi',
    },
    privacy: {
      eyebrow: 'Privacy',
      sectionTitle: "A tool that works for you shouldn't ask for blind trust.",
      sectionSubtitle:
        "An extension can touch your store settings and every submission you make. It shouldn't be a black box, so the data flow below is split into three columns you can check at a glance. The cloud pool, config sync and AI features only upload data when you use them.",
      colLocal: 'Local by default',
      colEgress: 'Only sent to Noon',
      colNever: 'Never seen by us',
      local: [
        'Store settings (country, partner code, warehouse, quantity, warranty, brand)',
        'Store records and which store is active',
        'Product batches, drafts and task history',
      ],
      egress: [
        'Product details (title, description, attributes, price, stock)',
        'Product images (prepared to the compliant spec)',
        'Warranty, activation and duplication requests',
      ],
      never: [
        'Your Noon account password',
        'Any tracking, analytics, or telemetry data',
        'Your browsing history or unrelated cookies',
        'Products or configs uploaded without your action',
      ],
    },
    permissions: {
      sectionTitle: 'Permissions, explained',
      sectionSubtitle: 'A few core permissions; the sites the tool uses are listed below',
      top: {
        activeTab: {
          name: 'Current tab',
          reason:
            'Read the current page only when you click the extension, to recognize the product or store page you have open.',
        },
        scripting: {
          name: 'Script injection',
          reason: 'Place the capture and confirmation interface into the page; it runs only on matched sites.',
        },
        storage: {
          name: 'Storage',
          reason: 'Save your store records, settings and batches in your browser.',
        },
      },
      fullTitle: 'Show the full permission list',
      full: {
        hostsTitle: 'Sites the tool uses',
        permissions: {
          storage: {
            name: 'Storage',
            reason: 'Save your store records, settings and batches.',
          },
          alarms: {
            name: 'Alarms',
            reason: 'Scan pending publish and duplicate tasks on a timer so they resume after a browser restart.',
          },
          notifications: {
            name: 'Notifications',
            reason: 'Tell you when a batch finishes or a task fails, so you do not have to watch the page.',
          },
          activeTab: {
            name: 'Current tab',
            reason: 'Read the current page only when you click the extension.',
          },
          scripting: {
            name: 'Script injection',
            reason: 'Place the capture and confirmation interface into the page.',
          },
          contextMenus: {
            name: 'Context menus',
            reason: 'Add right-click entries such as "Parse with AI".',
          },
        },
        hosts: {
          noonPartners: {
            name: 'Noon partner area',
            reason: "Noon's partner management pages (product catalog); publishing requests go here",
          },
          noonCdn: {
            name: 'Noon image server',
            reason: "Noon's image and file server",
          },
          alicdn: {
            name: '1688 / Taobao image server',
            reason: 'Product image servers for 1688 and Taobao',
          },
          jdimg: {
            name: 'JD image server',
            reason: 'JD product image servers',
          },
          backend: {
            name: "Tool's own service",
            reason: 'Handles translation, image processing and AI; stores no account data',
          },
        },
      },
    },
    faq: {
      sectionTitle: 'Frequently asked',
      items: {
        free: {
          q: 'Is Nomu free?',
          a: 'Yes, the tool itself is free. Settings and cookies stay in your own browser; no subscription.',
        },
        apiKey: {
          q: 'Do I need to provide a key or sign in somewhere?',
          a: 'No. Nomu works through your existing Noon login (cookies), so you never have to enter a password or key.',
        },
        regions: {
          q: 'Which Noon regions are supported?',
          a: 'Noon UAE and Noon Saudi today. Other regions are not validated and not promised.',
        },
        sources: {
          q: 'Can I use sources other than 1688?',
          a: 'Product pages on 1688, Taobao/Tmall and JD are supported, and noon.com pages can be used as a source too. For any other site, right-click and use "Parse with AI" to capture it on demand.',
        },
        data: {
          q: 'Where is my data stored?',
          a: "Store configs, batches and task history stay in your browser by default. Data only travels through the tool's own service when you actively use the cloud pool, config sync or export; none of those are required to publish normally.",
        },
        ai: {
          q: 'Do AI features cost extra?',
          a: 'The AI assistant, category suggestions and right-click parsing need a Nomu account and are billed in credits, topped up from the account page. Capture, translation and publishing work without signing in.',
        },
        translation: {
          q: 'How good is the translation? Should I proofread?',
          a: "Translation is automatic (Chinese to English and Arabic). For high-value or brand items, do a quick spot-check before publishing; auto-translation isn't guaranteed to be native-level.",
        },
        failure: {
          q: 'What happens if a listing fails?',
          a: 'The batch stops on the first failed item. That item is flagged in the list and can be retried on its own or fixed manually.',
        },
      },
    },
    support: {
      eyebrow: 'Support',
      sectionTitle: 'Stuck? Get in touch directly.',
      sectionSubtitle:
        'No forum digging. If install, capture or publishing gets stuck, or you have a feature idea, get in touch.',
      viewQr: 'View WeChat QR code',
      channels: {
        wechat: {
          title: 'WeChat (recommended)',
          body: 'Scan the QR code to add me, mention "Nomu". Day-to-day questions and feature requests live here.',
        },
        docs: {
          title: 'Ask the assistant, then the docs',
          body: 'Listing rules and field requirements can be asked straight to the in-extension AI assistant; install, updates and common questions live at nomu.kanocifer.chat/docs',
        },
      },
    },
    finalCta: {
      title: 'Make listing a pipeline',
      body: 'Capture, translate, prep images, publish, duplicate, watch the tasks — one extension covers it.',
      button: 'Add to Chrome',
      hint: 'One-click install from the Chrome Web Store',
    },
    footer: {
      tagline: 'Nomu: an easy-to-use Chrome extension for Noon',
      links: {
        privacy: 'Privacy',
        changelog: 'Changelog',
        support: 'Support',
        docs: 'Docs',
      },
      license: 'All rights reserved',
      placeholder: '(TBD)',
    },
  },
  nomuLogin: {
    headlinePending: 'Welcome back',
    headlineSuccess: 'Sign-in synced',
    headlineError: 'Unable to continue',
    sublinePending: 'Confirming this sign-in with Nomu…',
    sublineSuccess: 'You can return to the Nomu extension to keep working.',
    sublineFallbackError: "Nomu didn't confirm this link in time — it may have expired.",
    missingTokenError: 'Missing token — this link is invalid.',
    closePage: 'Close this page',
    retry: 'Try again',
  },
} as const;
