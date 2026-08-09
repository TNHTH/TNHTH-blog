import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

const site = process.env.PUBLIC_SITE_URL || "https://tnhth-portfolio.honest-civet-7225.chatgpt.site";

export default defineConfig({
  site,
  devToolbar: { enabled: false },
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
  markdown: { shikiConfig: { theme: "github-dark" } },
});
