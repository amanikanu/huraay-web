import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["huraay-icon.png", "huraay-logo.png"],
      manifest: {
        name: "Huraay",
        short_name: "Huraay",
        description: "One link for your birthday wishes, wishlist and gifts.",
        theme_color: "#6B25D9",
        background_color: "#FAF8FC",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/huraay-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /\/functions\/v1\//,
            handler: "NetworkOnly",
            options: { cacheName: "huraay-sensitive-api" },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["motion"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
});
