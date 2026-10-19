import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: { output: { manualChunks: { vendor: ["react", "react-dom", "dexie", "zustand"] } } },
  },
  server: {
    port: 5173,
    proxy: {
      "/runtime-config": "http://127.0.0.1:8787",
      "/health": "http://127.0.0.1:8787",
      "/v1": "http://127.0.0.1:8787",
    },
  },
});
