export const site = {
  name: "GUOHAO",
  alias: "TNHTH",
  headline: "Robotics · Learning · Systems",
  location: "Hangzhou, China",
  description: "A curated portfolio of robotics systems, reinforcement learning experiments, and technical notes.",
  github: "https://github.com/TNHTH",
  email: "",
  nav: [
    { label: "Work", href: "/work" },
    { label: "Notes", href: "/notes" },
    { label: "Writing", href: "/writing" },
    { label: "Gallery", href: "/gallery" },
    { label: "About", href: "/about" },
  ],
} as const;

export type Site = typeof site;
