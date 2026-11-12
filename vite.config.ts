import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const siteUrl = loadEnv(mode, process.cwd(), "VITE_").VITE_SITE_URL?.replace(/\/+$/, "") ?? "";

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "phimhub-og-site-url",
        transformIndexHtml(html) {
          return html.replaceAll("__PHIMHUB_SITE_URL__", siteUrl);
        },
      },
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("/node_modules/hls.js/")) return "hls";
          },
        },
      },
    },
  };
});
