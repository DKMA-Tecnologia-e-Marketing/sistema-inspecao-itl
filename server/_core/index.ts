import "dotenv/config";
// CRÍTICO: Importar ENV primeiro para validar variáveis de ambiente antes de qualquer outra coisa
import { ENV } from "./env";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerAsaasWebhook } from "./asaas-webhook";
import { registerIuguWebhook } from "./iugu-webhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

// Log de inicialização
console.log("🚀 Iniciando servidor...");
console.log("📋 Variáveis de ambiente críticas:");
console.log("   - JWT_SECRET:", ENV.cookieSecret ? `${ENV.cookieSecret.substring(0, 10)}...` : "NÃO DEFINIDO");
console.log("   - NODE_ENV:", process.env.NODE_ENV || "não definido");
console.log("   - PORT:", process.env.PORT || "5006 (padrão)");

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
        // Função para servir o index.html
        const serveIndexHtml = async (req: express.Request, res: express.Response) => {
          try {
            const fs = await import("fs");
            const path = await import("path");
            
            // CRÍTICO: Sempre tentar servir do dist/public primeiro (produção)
            // Se não existir, usar client/index.html (desenvolvimento)
            // Usar process.cwd() que é confiável em produção com PM2
            const appDir = process.cwd();
            if (!appDir) {
              throw new Error("process.cwd() returned undefined");
            }
            
            const distPath = path.resolve(appDir, "dist", "public", "index.html");
            // Tentar encontrar devPath usando diferentes estratégias
            let devPath: string;
            try {
              // Tentar usar import.meta.dirname se disponível
              if (typeof import.meta !== "undefined" && import.meta.dirname) {
                devPath = path.resolve(import.meta.dirname, "../..", "client", "index.html");
              } else {
                // Fallback: usar appDir
                devPath = path.resolve(appDir, "..", "client", "index.html");
              }
            } catch {
              devPath = path.resolve(appDir, "..", "client", "index.html");
            }
      
      // Verificar qual arquivo existe
      let templatePath: string;
      if (fs.existsSync(distPath)) {
        templatePath = distPath;
        console.log("[Serve HTML] Servindo HTML de produção:", templatePath);
      } else if (fs.existsSync(devPath)) {
        templatePath = devPath;
        console.log("[Serve HTML] Servindo HTML de desenvolvimento:", templatePath);
      } else {
        console.error("[Serve HTML] Nenhum template encontrado. Tentou:", { distPath, devPath });
        res.status(404).end("Page not found");
        return;
      }
      
      const template = await fs.promises.readFile(templatePath, "utf-8");
      const cacheBuster = Date.now();
      
      // Se o template contém /src/main.tsx, é desenvolvimento - adicionar cache busting
      // Se contém /assets/, é produção - adicionar cache busting aos assets
      const modifiedTemplate = template.includes("/src/main.tsx")
        ? template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${cacheBuster}"`)
        : template
            .replace(/src="\/assets\/([^"]+)"/g, (match, asset) => {
              return `src="/assets/${asset}?v=${cacheBuster}"`;
            })
            .replace(/href="\/assets\/([^"]+)"/g, (match, asset) => {
              return `href="/assets/${asset}?v=${cacheBuster}"`;
            });
      
      res.removeHeader("location");
      res.status(200).set({
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }).end(modifiedTemplate);
    } catch (e) {
      console.error("[Serve HTML] Error:", e);
      res.status(500).end("Error loading page");
    }
  };
  
  // CORS configuration - REMOVIDO porque o Nginx já gerencia CORS
  // O Nginx está configurado para adicionar headers CORS, então não precisamos fazer isso aqui
  // Isso evita duplicação de headers que causa erro "multiple values"
  
  // Apenas responder OPTIONS se o Nginx não estiver fazendo isso
  // (mas o Nginx já está configurado para isso)
  
  // Configure body parser
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Handler para raiz - retornar info da API ao invés de HTML
  app.get("/", (req, res) => {
    res.json({
      name: "Inspeciona SP API",
      version: "1.0.0",
      endpoints: {
        trpc: "/api/trpc",
        health: "/health",
      },
    });
  });
  
  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // Endpoint para servir PDFs e fotos dos laudos
  app.get("/api/storage/*", async (req, res) => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      
      // Usar caminho relativo ao projeto se STORAGE_PATH não estiver definido
      const storagePath = process.env.STORAGE_PATH || path.join(process.cwd(), "storage");
      let requestedPath = req.path.replace("/api/storage", "");
      // Remover barra inicial se existir
      if (requestedPath.startsWith("/")) {
        requestedPath = requestedPath.substring(1);
      }
      const filePath = path.join(storagePath, requestedPath);
      
      // Log para debug (pode remover depois)
      if (process.env.NODE_ENV === "development") {
        console.log("[Storage] Requisição:", {
          originalPath: req.path,
          requestedPath,
          storagePath,
          filePath,
          exists: fs.existsSync(filePath)
        });
      }
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: "Arquivo não encontrado" });
        return;
      }
      
      // Determinar content-type
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes: Record<string, string> = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
      };
      
      const contentType = contentTypes[ext] || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `inline; filename="${path.basename(filePath)}"`);
      
      // Adicionar headers CORS se necessário
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET");
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.on("error", (error) => {
        console.error("[Storage] Erro ao ler arquivo:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Erro ao ler arquivo" });
        }
      });
      fileStream.pipe(res);
    } catch (error: any) {
      console.error("[Storage] Erro ao servir arquivo:", error);
      res.status(500).json({ error: "Erro ao servir arquivo" });
    }
  });
  
  // Test endpoint para verificar se o servidor está respondendo
  app.get("/api/test", (req, res) => {
    res.json({ 
      message: "API está funcionando",
      timestamp: new Date().toISOString(),
      endpoint: "/api/trpc",
    });
  });
  
  // Handler para login.html apenas se não for domínio da API
  // (o frontend serve o HTML, não a API)
  app.get("/login.html", serveIndexHtml);
  
  // Logging middleware para todas as requisições (antes de outras rotas)
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.url.startsWith("/api/trpc")) {
      console.log("Content-Type:", req.headers["content-type"]);
      console.log("Origin:", req.headers.origin);
    }
    next();
  });
  
      // OAuth callback
      registerOAuthRoutes(app);
      // ASAAS Webhook
      registerAsaasWebhook(app);
      // IUGU Webhook
      registerIuguWebhook(app);

      // tRPC API
      app.use(
        "/api/trpc",
        createExpressMiddleware({
          router: appRouter,
          createContext,
          onError: ({ path, type, error, ctx, input }) => {
            console.error("========================================");
            console.error("[tRPC ERROR] Erro capturado no servidor:");
            console.error("Path:", path);
            console.error("Type:", type);
            console.error("Error message:", error.message);
            console.error("Error code:", error.code);
            console.error("Error stack:", error.stack);
            console.error("Input:", input);
            console.error("Context user:", ctx?.user ? `${ctx.user.email} (${ctx.user.id})` : "null");
            console.error("========================================");
          },
        })
      );
  
  // Em desenvolvimento, não servir arquivos estáticos se o frontend estiver separado
  // O frontend Vite rodará na porta 5005 separadamente
  if (process.env.NODE_ENV !== "development") {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "5006");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Em produção, escutar em 0.0.0.0 para aceitar conexões de qualquer interface
  // Em desenvolvimento, pode usar localhost
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "0.0.0.0";
  
  server.listen(port, host, () => {
    console.log(`🚀 Backend API running on http://${host}:${port}/`);
    console.log(`📡 tRPC endpoint: http://${host}:${port}/api/trpc`);
    console.log(`🌐 Listening on all interfaces (0.0.0.0)`);
    console.log(`✅ Server started successfully`);
    console.log(`📋 Environment: ${process.env.NODE_ENV || "development"}`);
  });

  // Tratamento de erros não capturados
  server.on("error", (error: NodeJS.ErrnoException) => {
    console.error("❌ Server error:", error);
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use`);
    }
  });

  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
  });
}

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  console.error("Stack:", error.stack);
  process.exit(1);
});
