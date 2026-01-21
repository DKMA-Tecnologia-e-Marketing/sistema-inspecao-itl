import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";

const plugins = [
  react({
    jsxRuntime: "automatic",
    babel: {
      plugins: [],
    },
  }),
  tailwindcss(),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // Substituir jose por módulo vazio no frontend
      jose: path.resolve(import.meta.dirname, "client", "src", "_core", "jose-stub.ts"),
      // Substituir nanoid por versão que não usa crypto
      nanoid: path.resolve(import.meta.dirname, "client", "src", "_core", "nanoid-polyfill.ts"),
      "nanoid/non-secure": path.resolve(import.meta.dirname, "client", "src", "_core", "nanoid-polyfill.ts"),
      // CRÍTICO: Substituir superjson por stub vazio no frontend
      // Superjson usa crypto e não deve estar no bundle do frontend
      superjson: path.resolve(import.meta.dirname, "client", "src", "_core", "superjson-stub.ts"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    exclude: [
      // Excluir superjson do pré-empacotamento
      'superjson',
    ],
  },
  server: {
    port: 5005,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:5006",
        changeOrigin: true,
        secure: false,
      },
    },
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
