import React from "react";
import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// URL da API - usar variável de ambiente em produção ou relativa em desenvolvimento
const getApiUrl = () => {
  // Verificar se estamos em produção de múltiplas formas
  const isProduction = import.meta.env.PROD || 
                       import.meta.env.MODE === "production" ||
                       window.location.hostname !== "localhost" && 
                       window.location.hostname !== "127.0.0.1";
  
  if (isProduction) {
    // Em produção, usar a URL completa da API
    const apiUrl = import.meta.env.VITE_API_URL || "https://api.inspecionasp.com.br/api/trpc";
    console.log("[tRPC Client] Usando URL de produção:", apiUrl);
    return apiUrl;
  }
  // Em desenvolvimento, usar proxy do Vite (configurado em vite.config.ts)
  // O proxy redireciona /api para http://localhost:5006
  const apiUrl = "/api/trpc";
  console.log("[tRPC Client] Usando URL de desenvolvimento:", apiUrl);
  return apiUrl;
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getApiUrl(),
      fetch(input, init) {
        const url = typeof input === "string" ? input : input.url;
        console.log("[tRPC Fetch] Requesting:", url, "Method:", init?.method || "GET");
        
        // Preparar headers sem duplicar Content-Type
        const headers = new Headers(init?.headers);
        // Não sobrescrever Content-Type se já existir (tRPC já define isso)
        if (!headers.has("Content-Type") && (init?.method === "POST" || init?.method === "PUT" || init?.method === "PATCH")) {
          headers.set("Content-Type", "application/json");
        }
        
        return fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          mode: "cors",
          headers: headers,
        }).then(async (response) => {
          console.log("[tRPC Fetch] Response status:", response.status, "URL:", response.url);
          const contentType = response.headers.get("content-type");
          console.log("[tRPC Fetch] Content-Type:", contentType);
          
          if (contentType && contentType.includes("text/html")) {
            const text = await response.text();
            console.error("[tRPC Fetch] API retornou HTML em vez de JSON:");
            console.error("URL:", response.url);
            console.error("Status:", response.status);
            console.error("HTML (primeiros 500 chars):", text.substring(0, 500));
            throw new Error(`Servidor retornou uma página de erro (${response.status}). Verifique se o backend está rodando em ${url}`);
          }
          
          if (!response.ok) {
            console.error("[tRPC Fetch] Response não OK:", response.status, response.statusText);
          }
          
          return response;
        }).catch((error) => {
          console.error("[tRPC Fetch] Fetch error:", error);
          console.error("URL:", url);
          throw error;
        });
      },
    }),
  ],
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

try {
  createRoot(rootElement).render(
    <React.StrictMode>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    </React.StrictMode>
  );
} catch (error) {
  console.error("Error rendering app:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: Arial; color: red;">
      <h1>Erro ao renderizar aplicação</h1>
      <pre>${error instanceof Error ? error.stack : String(error)}</pre>
      <button onclick="window.location.reload()">Recarregar</button>
    </div>
  `;
}
