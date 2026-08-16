import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

const site = process.env.PUBLIC_SITE_URL || "https://tnhth-portfolio.vercel.app";

export default defineConfig({
  site,
  output: "static",
  devToolbar: { enabled: false },
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
  markdown: { shikiConfig: { theme: "github-dark" } },
});
