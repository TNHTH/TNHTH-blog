import profile from "../src/data/profile.json";

export const site = {
  ...profile,
  nav: [
    { label: "首页", href: "/" },
    { label: "项目", href: "/projects" },
    { label: "笔记", href: "/notes" },
    { label: "关于", href: "/about" },
  ],
} as const;

export const statusLabel = {
  prototype: "原型",
  active: "进行中",
  completed: "已完成",
  archived: "归档",
} as const;

export type Site = typeof site;
