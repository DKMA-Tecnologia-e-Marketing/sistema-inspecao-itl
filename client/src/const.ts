export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "App";

export const APP_LOGO =
  import.meta.env.VITE_APP_LOGO ||
  "https://placehold.co/128x128/E1E7EF/1F2937?text=App";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  
  // Preservar a URL atual para redirecionar após o login
  const currentPath = window.location.pathname;
  
  // If OAuth is not configured, return root path (login page)
  if (!oauthPortalUrl || !appId) {
    console.warn("OAuth não configurado. Usando modo de desenvolvimento.");
    return "/";
  }
  
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(`${redirectUri}?redirect=${encodeURIComponent(currentPath)}`);

  try {
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch (error) {
    console.error("Erro ao criar URL de login:", error);
    return "/";
  }
};