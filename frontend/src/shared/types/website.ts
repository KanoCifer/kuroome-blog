// 推荐网站（pages/websites + entry/BentoWebsites 共用）

export interface Website {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  category: string;
  tags: string[];
  /** 主人手写的一句荐语（书房语气） */
  note: string;
}
