import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
// nanoid removido - usar alternativa que não precisa de crypto
// import { nanoid } from "nanoid";
function nanoid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupVite(app: Express, server: Server) {
  // Apenas em desenvolvimento - importar vite dinamicamente
  if (process.env.NODE_ENV !== "development") {
    throw new Error("setupVite should only be called in development mode");
  }

  // Importar vite apenas quando necessário (em desenvolvimento)
  const viteModule = await import("vite");
  const createViteServer = viteModule.createServer;
  const viteConfig = await import("../../vite.config").then(m => m.default);

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  // Criar servidor Vite SEM o plugin manus-runtime
  const viteConfigWithoutManus = {
    ...viteConfig,
    plugins: viteConfig.plugins?.filter((p: any) => {
      const pluginName = p?.name || p?.constructor?.name || "";
      return !pluginName.toLowerCase().includes("manus");
    }) || [],
  };

  const vite = await createViteServer({
    ...viteConfigWithoutManus,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  // Usar o middleware do Vite para tudo
  app.use(vite.middlewares);
  
  // Handler catch-all para SPA routing - servir index.html para todas as rotas
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl || req.url || "";

    // Ignorar APIs e arquivos estáticos
    if (url.startsWith("/api/") || url.startsWith("/src/") || url.includes(".")) {
      return next();
    }
    
    // Servir index.html para todas as rotas SPA
    try {
      const clientTemplate = path.resolve(
        __dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache, no-store, must-revalidate" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "../..", "dist", "public");
  
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
    return;
  }

  // Servir arquivos estáticos com headers de no-cache para JS/CSS
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
      }
    }
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
