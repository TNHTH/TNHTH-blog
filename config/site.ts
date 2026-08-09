import profile from "../src/data/profile.json";

export const site = {
  ...profile,
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
