import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:8000",
        changeOrigin: false,
      },
      "/healthz/": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:8000",
        changeOrigin: false,
      },
      "/media": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:8000",
        changeOrigin: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
