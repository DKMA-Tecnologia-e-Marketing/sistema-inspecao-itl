import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    // Se OAuth não está configurado e estamos em desenvolvimento, criar usuário admin padrão
    if (!ENV.oAuthServerUrl && ENV.isProduction === false) {
      try {
        const devOpenId = "dev-admin-local";
        const devUser = {
          openId: devOpenId,
          name: "Administrador Local",
          email: "admin@local.dev",
          loginMethod: "local",
          role: "admin" as const,
          lastSignedIn: new Date(),
        };

        await db.upsertUser(devUser);

        const sessionToken = await sdk.createSessionToken(devOpenId, {
          name: devUser.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(req);
        // Em desenvolvimento local, ajustar sameSite para lax
        const devCookieOptions = {
          ...cookieOptions,
          sameSite: "lax" as const,
          secure: false,
        };
        res.cookie(COOKIE_NAME, sessionToken, { ...devCookieOptions, maxAge: ONE_YEAR_MS });

        // Preservar a URL de destino se estiver no redirect
        const redirectParam = getQueryParam(req, "redirect");
        const redirectTo = redirectParam || "/admin";
        const finalRedirect = redirectTo.startsWith("/") ? redirectTo : "/admin";
        res.redirect(302, finalRedirect);
        return;
      } catch (error) {
        console.error("[OAuth] Failed to create dev user", error);
        res.status(500).json({ error: "Failed to create development user" });
        return;
      }
    }

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      // Em desenvolvimento, ajustar sameSite
      const devCookieOptions = ENV.isProduction === false 
        ? { ...cookieOptions, sameSite: "lax" as const, secure: false }
        : cookieOptions;
      res.cookie(COOKIE_NAME, sessionToken, { ...devCookieOptions, maxAge: ONE_YEAR_MS });

      // Preservar a URL de destino se estiver no redirect ou state
      let redirectTo = getQueryParam(req, "redirect");
      if (!redirectTo && state) {
        try {
          // Usar Buffer no Node.js ao invés de atob (que é do browser)
          const decodedState = Buffer.from(state, 'base64').toString('utf-8');
          const match = decodedState.match(/redirect=([^&]+)/);
          if (match) {
            redirectTo = decodeURIComponent(match[1]);
          }
        } catch (e) {
          // Se falhar, usar padrão
        }
      }
      const finalRedirect = (redirectTo && redirectTo.startsWith("/")) ? redirectTo : "/";
      res.redirect(302, finalRedirect);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
