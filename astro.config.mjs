import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const site = process.env.PUBLIC_SITE_URL ?? env.PUBLIC_SITE_URL;
  if (!site) throw new Error("PUBLIC_SITE_URL is required");

  return {
    output: "static",
    site,
    devToolbar: { enabled: false },
    integrations: [sitemap()],
    vite: { plugins: [tailwindcss()] },
    markdown: { shikiConfig: { theme: "github-dark" } },
  };
});
