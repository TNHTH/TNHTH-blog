export const site = {
  name: "GUOHAO",
  alias: "TNHTH",
  headline: "机器人 · 学习 · 系统",
  location: "中国 · 杭州",
  description: "关于机器人系统、强化学习实验与工程笔记的精选公开档案。",
  github: "https://github.com/TNHTH",
  email: "",
  nav: [
    { label: "项目", href: "/work" },
    { label: "笔记", href: "/notes" },
    { label: "写作", href: "/writing" },
    { label: "图库", href: "/gallery" },
    { label: "关于", href: "/about" },
  ],
} as const;

export const statusLabel = {
  ongoing: "进行中",
  partial: "阶段性",
  reproduction: "复现适配",
  complete: "已完成",
} as const;

export type Site = typeof site;
