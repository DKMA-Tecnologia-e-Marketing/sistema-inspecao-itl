import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { users } from "../drizzle/schema";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado. Apenas administradores." });
  }
  return next({ ctx });
});

// Tenant-scoped procedure (for operators)
const tenantProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.tenantId && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Usuário não associado a um estabelecimento." });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async (opts) => {
      return opts.ctx.user;
    }),
    
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        console.log("[Login] Tentativa de login:", input.email);
        const user = await db.getUserByEmail(input.email);
        console.log("[Login] Usuário encontrado:", user ? `Sim (${user.email}, role: ${user.role})` : "Não");
        console.log("[Login] Tem senha:", user ? !!user.passwordHash : false);
        if (!user || !user.passwordHash) {
          console.log("[Login] Erro: usuário não encontrado ou sem senha");
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha inválidos" });
        }

        const bcrypt = await import("bcrypt");
        const isValid = await bcrypt.compare(input.password, user.passwordHash);
        console.log("[Login] Senha válida:", isValid);
        if (!isValid) {
          console.log("[Login] Erro: senha inválida");
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha inválidos" });
        }
        console.log("[Login] Login bem-sucedido para:", user.email);

        // Criar sessão
        const { sdk } = await import("./_core/sdk");
        const { ONE_YEAR_MS } = await import("@shared/const");
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        // Atualizar último acesso
        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: new Date(),
        });

        return { success: true, user };
      }),

    setPassword: protectedProcedure
      .input(z.object({ password: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const bcrypt = await import("bcrypt");
        const passwordHash = await bcrypt.hash(input.password, 10);

        await db.updateUserPassword(ctx.user.id, passwordHash);
        return { success: true };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      
      // Limpar cookie com todas as combinações possíveis para garantir que seja removido
      const clearOptions = [
        { ...cookieOptions, maxAge: -1, path: "/" },
        { path: "/", maxAge: -1 },
        { path: "/", maxAge: 0 },
        { path: "/", expires: new Date(0) },
      ];
      
      // Se tiver domain, limpar também com domain
      if (cookieOptions.domain) {
        clearOptions.push(
          { ...cookieOptions, maxAge: -1, path: "/", domain: cookieOptions.domain },
          { path: "/", maxAge: -1, domain: cookieOptions.domain },
          { path: "/", maxAge: 0, domain: cookieOptions.domain }
        );
      }
      
      // Limpar também sem domain (para casos onde o cookie foi setado sem domain)
      clearOptions.push(
        { path: "/", maxAge: -1, sameSite: "lax", secure: false },
        { path: "/", maxAge: -1, sameSite: "none", secure: true },
        { path: "/", maxAge: -1, sameSite: "strict", secure: true }
      );
      
      // Aplicar todas as combinações
      clearOptions.forEach((options) => {
        ctx.res.clearCookie(COOKIE_NAME, options);
      });
      
      // Também definir o cookie como vazio com expiração no passado
      ctx.res.cookie(COOKIE_NAME, "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
        httpOnly: true,
        secure: cookieOptions.secure || false,
        sameSite: cookieOptions.sameSite || "lax",
        ...(cookieOptions.domain && { domain: cookieOptions.domain }),
      });
      
      return {
        success: true,
      } as const;
    }),
  }),

  // ============= TENANT ROUTES =============
  tenants: router({
    list: adminProcedure.query(async () => {
      return await db.getAllTenants();
    }),

    listActive: publicProcedure.query(async () => {
      return await db.getActiveTenants();
    }),

    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getTenantById(input.id);
    }),

    create: adminProcedure
      .input(
        z.object({
          nome: z.string(),
          cnpj: z.string(),
          telefone: z.string().optional(),
          email: z.string().email().optional(),
          endereco: z.string().optional(),
          cidade: z.string().optional(),
          estado: z.string().optional(),
          cep: z.string().optional(),
          latitude: z.string().optional(),
          longitude: z.string().optional(),
          asaasWalletId: z.string().optional(),
          iuguAccountId: z.string().optional(),
          iuguSubaccountToken: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createTenant(input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          cnpj: z.string().optional(),
          telefone: z.string().optional(),
          email: z.string().email().optional(),
          endereco: z.string().optional(),
          cidade: z.string().optional(),
          estado: z.string().optional(),
          cep: z.string().optional(),
          latitude: z.string().optional(),
          longitude: z.string().optional(),
          asaasWalletId: z.string().optional(),
          iuguAccountId: z.string().optional(),
          iuguSubaccountToken: z.string().optional(),
          diasFuncionamento: z.array(z.number()).optional(), // Array de dias da semana (0-6)
          horarioInicio: z.string().optional(), // HH:mm
          horarioFim: z.string().optional(), // HH:mm
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // Permitir que tenants atualizem seus próprios dados (exceto campos sensíveis)
        if (ctx.user.role !== "admin" && ctx.user.tenantId === id) {
          // Remover campos que apenas admin pode alterar
          delete (data as any).cnpj;
          delete (data as any).asaasWalletId;
          delete (data as any).iuguAccountId;
          delete (data as any).iuguSubaccountToken;
          delete (data as any).ativo;
        } else if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para atualizar este estabelecimento" });
        }
        
        // Se iuguSubaccountToken está sendo atualizado, logar para debug
        if (data.iuguSubaccountToken !== undefined) {
          const tokenPreview = data.iuguSubaccountToken.substring(0, 8) + "***" + data.iuguSubaccountToken.substring(data.iuguSubaccountToken.length - 4);
          console.log(`[TENANTS] Atualizando iuguSubaccountToken para tenant ${id}: ${tokenPreview}`);
          console.log(`[TENANTS] Token completo (primeiros 12 e últimos 4): ${data.iuguSubaccountToken.substring(0, 12)}...${data.iuguSubaccountToken.substring(data.iuguSubaccountToken.length - 4)}`);
        }
        
        // Converter diasFuncionamento para JSON se fornecido
        if (data.diasFuncionamento !== undefined) {
          (data as any).diasFuncionamento = JSON.stringify(data.diasFuncionamento);
        }
        return await db.updateTenant(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTenant(input.id);
        return { success: true } as const;
      }),

    updateSubaccountToken: adminProcedure
      .input(
        z.object({
          tenantId: z.number(),
          iuguSubaccountToken: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const tenant = await db.getTenantById(input.tenantId);
        if (!tenant) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tenant não encontrado" });
        }

        const tokenPreview = input.iuguSubaccountToken.substring(0, 8) + "***" + input.iuguSubaccountToken.substring(input.iuguSubaccountToken.length - 4);
        console.log(`[TENANTS] Atualizando iuguSubaccountToken para tenant ${input.tenantId} (${tenant.nome || 'N/A'}): ${tokenPreview}`);
        console.log(`[TENANTS] Token completo (primeiros 12 e últimos 4): ${input.iuguSubaccountToken.substring(0, 12)}...${input.iuguSubaccountToken.substring(input.iuguSubaccountToken.length - 4)}`);
        
        await db.updateTenant(input.tenantId, {
          iuguSubaccountToken: input.iuguSubaccountToken,
        });

        // Invalidar cache de token se houver
        if (tenant.iuguAccountId) {
          const { invalidarCacheTokenSubconta } = await import("./integrations/iugu");
          invalidarCacheTokenSubconta(tenant.iuguAccountId);
        }

        return {
          success: true,
          tenantId: input.tenantId,
          tenantName: tenant.nome,
          tokenPreview,
        };
      }),

    getTokenInfo: adminProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input }) => {
        const tenant = await db.getTenantById(input.tenantId);
        if (!tenant) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tenant não encontrado" });
        }

        const token = (tenant as any).iuguSubaccountToken;
        const tokenPreview = token 
          ? token.substring(0, 8) + "***" + token.substring(token.length - 4)
          : "NÃO CONFIGURADO";
        const tokenFirst12 = token 
          ? token.substring(0, 12) + "..." + token.substring(token.length - 4)
          : "N/A";
        const tokenLength = token ? token.length : 0;

        return {
          tenantId: input.tenantId,
          tenantName: tenant.nome,
          iuguAccountId: tenant.iuguAccountId || "NÃO CONFIGURADO",
          iuguSubaccountToken: token || "NÃO CONFIGURADO",
          tokenPreview,
          tokenFirst12,
          tokenLength,
          isConfigured: !!token,
        };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTenantById(input.id);
      }),
  }),

  // ============= CUSTOMER ROUTES =============
  customers: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return await db.getAllCustomers();
      }
      if (ctx.user.tenantId) {
        return await db.getCustomersByTenant(ctx.user.tenantId);
      }
      throw new TRPCError({ code: "FORBIDDEN" });
    }),

    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getCustomerById(input.id);
    }),

    getByCpf: publicProcedure.input(z.object({ cpf: z.string() })).query(async ({ input }) => {
      return await db.getCustomerByCpf(input.cpf);
    }),

    getByEmail: publicProcedure.input(z.object({ email: z.string().email() })).query(async ({ input }) => {
      return await db.getCustomerByEmail(input.email);
    }),

    create: publicProcedure
      .input(
        z.object({
          nome: z.string(),
          cpf: z.string(),
          email: z.string().email().optional(),
          telefone: z.string().optional(),
          endereco: z.string().optional(),
          cep: z.string().optional(),
          cidade: z.string().optional(),
          estado: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createCustomer(input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          email: z.string().email().optional(),
          telefone: z.string().optional(),
          emailVerificado: z.boolean().optional(),
          telefoneVerificado: z.boolean().optional(),
          endereco: z.string().optional(),
          cep: z.string().optional(),
          cidade: z.string().optional(),
          estado: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateCustomer(id, data);
      }),

    delete: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCustomer(input.id);
        return { success: true };
      }),

    sendEmailVerification: publicProcedure
      .input(z.object({ email: z.string().email(), customerId: z.number().optional() }))
      .mutation(async ({ input }) => {
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[Email Verification] Token para ${input.email}: ${token}`);
        
        // Enviar e-mail com token
        try {
          const { enviarEmail, EMAIL_TEMPLATES } = await import("./integrations/email");
          await enviarEmail({
            to: input.email,
            subject: "Código de Verificação - Sistema ITL",
            html: EMAIL_TEMPLATES.tokenValidacao(token),
          });
        } catch (error: any) {
          console.error("[Email] Erro ao enviar e-mail:", error.message);
          // Continuar mesmo se falhar (em dev pode não estar configurado)
        }
        
        // TODO: Salvar token no banco com expiração
        // Por enquanto, retornar token para desenvolvimento
        return {
          success: true,
          token: process.env.NODE_ENV === "development" ? token : undefined, // Só retornar token em dev
          message: "E-mail de verificação enviado",
        };
      }),

    sendSmsVerification: publicProcedure
      .input(z.object({ telefone: z.string(), customerId: z.number().optional() }))
      .mutation(async ({ input }) => {
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[SMS Verification] Token para ${input.telefone}: ${token}`);
        
        // Enviar SMS com token
        try {
          const { enviarSMS, SMS_TEMPLATES } = await import("./integrations/sms");
          await enviarSMS(input.telefone, SMS_TEMPLATES.tokenValidacao(token));
        } catch (error: any) {
          console.error("[SMS] Erro ao enviar SMS:", error.message);
          // Continuar mesmo se falhar (em dev pode não estar configurado)
        }
        
        // TODO: Salvar token no banco com expiração
        // Por enquanto, retornar token para desenvolvimento
        return {
          success: true,
          token: process.env.NODE_ENV === "development" ? token : undefined, // Só retornar token em dev
          message: "SMS de verificação enviado",
        };
      }),

    verifyToken: publicProcedure
      .input(
        z.object({
          customerId: z.number(),
          token: z.string(),
          type: z.enum(["email", "sms"]),
        })
      )
      .mutation(async ({ input }) => {
        // TODO: Validar token no banco de dados com expiração
        // Por enquanto, aceitar qualquer token de 6 dígitos em desenvolvimento
        if (process.env.NODE_ENV === "development") {
          // Validar formato do token (6 dígitos)
          if (!/^\d{6}$/.test(input.token)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Token deve ter 6 dígitos" });
          }
          
          await db.updateCustomer(input.customerId, {
            [input.type === "email" ? "emailVerificado" : "telefoneVerificado"]: true,
          });
          return { success: true, message: `${input.type === "email" ? "E-mail" : "Telefone"} verificado com sucesso` };
        }
        
        // Em produção, verificar token no banco com expiração
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Token inválido" });
      }),
  }),

  // ============= VEHICLE ROUTES =============
  vehicles: router({
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getVehicleById(input.id);
    }),

    getByPlaca: publicProcedure.input(z.object({ placa: z.string() })).query(async ({ input }) => {
      console.log("[Vehicles] Buscando veículo por placa:", input.placa);
      const vehicle = await db.getVehicleByPlaca(input.placa);
      console.log("[Vehicles] Resultado da busca:", vehicle ? `Encontrado: ${vehicle.placa} (ID: ${vehicle.id})` : "Não encontrado");
      return vehicle;
    }),

    getByCustomer: protectedProcedure.input(z.object({ customerId: z.number() })).query(async ({ input }) => {
      return await db.getVehiclesByCustomer(input.customerId);
    }),

    consultarInfosimples: publicProcedure
      .input(z.object({ placa: z.string(), renavam: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { consultarVeiculo } = await import("./integrations/infosimples");
        const dados = await consultarVeiculo(input.placa, input.renavam);
        return dados;
      }),

    create: publicProcedure
      .input(
        z.object({
          placa: z.string(),
          renavam: z.string().optional(),
          chassi: z.string().optional(),
          marca: z.string().optional(),
          modelo: z.string().optional(),
          ano: z.number().optional(),
          cor: z.string().optional(),
          customerId: z.number(),
          dadosInfosimples: z.any().optional(),
        })
      )
      .mutation(async ({ input }) => {
        console.log("[Vehicles] Criando vehicle:", { placa: input.placa, customerId: input.customerId });
        try {
          const vehicle = await db.createVehicle(input);
          console.log("[Vehicles] Vehicle criado com sucesso:", vehicle?.id);
          return vehicle;
        } catch (error: any) {
          console.error("[Vehicles] Erro ao criar vehicle:", error);
          throw error;
        }
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          placa: z.string().optional(),
          renavam: z.string().optional(),
          chassi: z.string().optional(),
          marca: z.string().optional(),
          modelo: z.string().optional(),
          ano: z.number().optional(),
          cor: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateVehicle(id, data);
      }),
  }),

  // ============= SERVICE CATEGORY ROUTES =============
  serviceCategories: router({
    list: publicProcedure.query(async () => {
      return await db.getAllServiceCategories();
    }),

    listActive: publicProcedure.query(async () => {
      return await db.getActiveServiceCategories();
    }),

    create: adminProcedure
      .input(
        z.object({
          nome: z.string(),
          descricao: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createServiceCategory(input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          descricao: z.string().optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateServiceCategory(id, data);
      }),
  }),

  // ============= SERVICE ROUTES =============
  services: router({
    list: publicProcedure.query(async () => {
      return await db.getAllServices();
    }),

    listByCategory: publicProcedure.input(z.object({ categoryId: z.number() })).query(async ({ input }) => {
      return await db.getServicesByCategory(input.categoryId);
    }),

    create: adminProcedure
      .input(
        z.object({
          nome: z.string(),
          descricao: z.string().optional(),
          categoryId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createService(input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          descricao: z.string().optional(),
          categoryId: z.number().optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateService(id, data);
      }),
  }),

  // ============= INSPECTION SCOPE ROUTES =============
  inspectionScopes: router({
    list: publicProcedure.query(async () => {
      return await db.getAllInspectionScopes();
    }),

    listByType: publicProcedure.input(z.object({ tipo: z.string() })).query(async ({ input }) => {
      return await db.getInspectionScopesByType(input.tipo);
    }),

    create: adminProcedure
      .input(
        z.object({
          nome: z.string(),
          tipo: z.enum(["inmetro", "prefeitura_sp", "prefeitura_guarulhos", "mercosul", "tecnica"]),
          descricao: z.string().optional(),
          requerAutorizacaoDetran: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createInspectionScope(input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          tipo: z.enum(["inmetro", "prefeitura_sp", "prefeitura_guarulhos", "mercosul", "tecnica"]).optional(),
          descricao: z.string().optional(),
          requerAutorizacaoDetran: z.boolean().optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateInspectionScope(id, data);
      }),
  }),

  // ============= INSPECTION TYPE ROUTES =============
  inspectionTypes: router({
    list: publicProcedure
      .input(z.object({ includeInactive: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllInspectionTypes(input?.includeInactive ?? false);
      }),

    listByTenant: tenantProcedure
      .input(z.object({ tenantId: z.number().optional(), includeInactive: z.boolean().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const tenantId = input?.tenantId ?? ctx.user.tenantId;
        if (!tenantId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant não informado" });
        }
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        // Retorna apenas os tipos de inspeção que o tenant tem capacidade nas suas linhas
        return await db.getInspectionTypesByTenant(tenantId, input?.includeInactive ?? false);
      }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const inspectionType = await db.getInspectionTypeById(input.id);
      if (!inspectionType) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tipo de inspeção não encontrado" });
      }
      return inspectionType;
    }),

    create: adminProcedure
      .input(
        z.object({
          nome: z.string(),
          categoria: z.string().optional(),
          descricao: z.string().optional(),
          orgao: z.string().optional(),
          precoBase: z.number().int().nonnegative(),
          variacaoMaxima: z.number().int().min(0).optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createInspectionType({
          ...input,
          variacaoMaxima: input.variacaoMaxima ?? 0,
          ativo: input.ativo ?? true,
        });
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          categoria: z.string().optional(),
          descricao: z.string().optional(),
          orgao: z.string().optional(),
          precoBase: z.number().int().nonnegative().optional(),
          variacaoMaxima: z.number().int().min(0).optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateInspectionType(id, data);
      }),

    importBulk: adminProcedure
      .input(
        z.object({
          fileData: z.string(), // Base64 do arquivo Excel
          fileName: z.string(),
          fieldMapping: z.object({
            nome: z.string(),
            categoria: z.string().optional(),
            descricao: z.string().optional(),
            orgao: z.string().optional(),
            precoBase: z.string().optional(),
            variacaoMaxima: z.string().optional(),
            ativo: z.string().optional(),
          }),
          skipFirstRow: z.boolean().optional().default(true),
        })
      )
      .mutation(async ({ input }) => {
        const XLSX = await import("xlsx");
        
        // Decodificar base64
        const fileBuffer = Buffer.from(input.fileData, "base64");
        
        // Ler o arquivo Excel
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converter para JSON
        const rows = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });
        
        if (rows.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "O arquivo Excel está vazio" });
        }
        
        const results = {
          success: 0,
          errors: [] as Array<{ row: number; error: string }>,
          total: rows.length,
        };
        
        // Processar cada linha
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i] as Record<string, any>;
          const rowNumber = i + (input.skipFirstRow ? 2 : 1); // +2 porque começa em 1 e pula header
          
          try {
            // Mapear campos do Excel para os campos do banco
            const nome = row[input.fieldMapping.nome]?.toString().trim();
            if (!nome) {
              results.errors.push({ row: rowNumber, error: "Nome é obrigatório" });
              continue;
            }
            
            const categoria = input.fieldMapping.categoria ? row[input.fieldMapping.categoria]?.toString().trim() : undefined;
            const descricao = input.fieldMapping.descricao ? row[input.fieldMapping.descricao]?.toString().trim() : undefined;
            const orgao = input.fieldMapping.orgao ? row[input.fieldMapping.orgao]?.toString().trim() : undefined;
            
            // Converter preço base
            let precoBase = 0;
            if (input.fieldMapping.precoBase) {
              const precoStr = row[input.fieldMapping.precoBase]?.toString().trim() || "0";
              const precoNum = parseFloat(precoStr.replace(",", ".").replace(/[^\d.,]/g, ""));
              if (!isNaN(precoNum) && precoNum >= 0) {
                precoBase = Math.round(precoNum * 100); // Converter para centavos
              }
            }
            
            // Converter variação máxima
            let variacaoMaxima = 0;
            if (input.fieldMapping.variacaoMaxima) {
              const variacaoStr = row[input.fieldMapping.variacaoMaxima]?.toString().trim() || "0";
              const variacaoNum = parseFloat(variacaoStr.replace(",", ".").replace(/[^\d.,]/g, ""));
              if (!isNaN(variacaoNum) && variacaoNum >= 0) {
                variacaoMaxima = Math.round(variacaoNum * 100); // Converter para centavos
              }
            }
            
            // Converter ativo (padrão: true)
            let ativo = true;
            if (input.fieldMapping.ativo) {
              const ativoStr = row[input.fieldMapping.ativo]?.toString().trim().toLowerCase();
              ativo = ativoStr !== "não" && ativoStr !== "nao" && ativoStr !== "false" && ativoStr !== "0" && ativoStr !== "inativo";
            }
            
            // Criar tipo de inspeção
            await db.createInspectionType({
              nome,
              categoria: categoria || undefined,
              descricao: descricao || undefined,
              orgao: orgao || undefined,
              precoBase,
              variacaoMaxima,
              ativo,
            });
            
            results.success++;
          } catch (error: any) {
            results.errors.push({
              row: rowNumber,
              error: error.message || "Erro desconhecido",
            });
          }
        }
        
        return results;
      }),

    getTenants: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getInspectionTypeTenants(input.id);
    }),

    linkTenant: adminProcedure
      .input(z.object({ inspectionTypeId: z.number(), tenantId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.linkInspectionTypeToTenant(input.inspectionTypeId, input.tenantId);
      }),

    unlinkTenant: adminProcedure
      .input(z.object({ inspectionTypeId: z.number(), tenantId: z.number() }))
      .mutation(async ({ input }) => {
        await db.unlinkInspectionTypeFromTenant(input.inspectionTypeId, input.tenantId);
        return { success: true };
      }),
  }),

  // ============= INSPECTION LINE ROUTES =============
  inspectionLines: router({
    listByTenant: tenantProcedure
      .input(
        z
          .object({
            tenantId: z.number().optional(),
            includeInactive: z.boolean().optional(),
            withCapabilities: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const tenantId = input?.tenantId ?? ctx.user.tenantId;
        if (!tenantId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant não informado" });
        }
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const lines = await db.getInspectionLinesByTenant(tenantId, input?.includeInactive ?? false);

        if (!input?.withCapabilities) {
          return lines;
        }

        const linesWithCapabilities = [];
        for (const line of lines) {
          const capabilities = await db.getCapabilitiesByInspectionLine(line.id);
          linesWithCapabilities.push({ ...line, capabilities });
        }
        return linesWithCapabilities;
      }),

    create: adminProcedure
      .input(
        z.object({
          tenantId: z.number(),
          nome: z.string().optional(),
          tipo: z.enum(["leve", "mista", "pesado", "motocicleta", "outra"]),
          descricao: z.string().optional(),
          quantidade: z.number().int().min(1).optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createInspectionLine({
          ...input,
          quantidade: input.quantidade ?? 1,
          ativo: input.ativo ?? true,
        });
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          tipo: z.enum(["leve", "mista", "pesado", "motocicleta", "outra"]).optional(),
          descricao: z.string().optional(),
          quantidade: z.number().int().min(1).optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateInspectionLine(id, data);
      }),
  }),

  // ============= INSPECTION LINE CAPABILITIES ROUTES =============
  inspectionLineCapabilities: router({
    listByLine: tenantProcedure.input(z.object({ inspectionLineId: z.number() })).query(async ({ input, ctx }) => {
      const line = await db.getInspectionLineById(input.inspectionLineId);
      if (!line) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Linha de inspeção não encontrada" });
      }
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== line.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.getCapabilitiesByInspectionLine(input.inspectionLineId);
    }),

    create: adminProcedure
      .input(
        z.object({
          inspectionLineId: z.number(),
          inspectionTypeId: z.number(),
          capacidade: z.number().int().min(0).optional(),
          observacoes: z.string().optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createInspectionLineCapability({
          ...input,
          capacidade: input.capacidade ?? 0,
          ativo: input.ativo ?? true,
        });
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          capacidade: z.number().int().min(0).optional(),
          observacoes: z.string().optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateInspectionLineCapability(id, data);
      }),

    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return await db.deleteInspectionLineCapability(input.id);
    }),
  }),

  // ============= INSPECTION TYPE PRICING ROUTES =============
  inspectionTypePricing: router({
    listByTenant: tenantProcedure
      .input(z.object({ tenantId: z.number().optional(), includeInactive: z.boolean().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const tenantId = input?.tenantId ?? ctx.user.tenantId;
        if (!tenantId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant não informado" });
        }
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Buscar apenas os tipos de inspeção que o tenant tem capacidade nas suas linhas
        const [types, prices] = await Promise.all([
          db.getInspectionTypesByTenant(tenantId, input?.includeInactive ?? false),
          db.getInspectionTypePricesByTenant(tenantId),
        ]);

        return types.map((type) => {
          const price = prices.find((p) => p.inspectionTypeId === type.id);
          return {
            type,
            pricing: price,
            faixa: {
              minimo: Math.max(0, type.precoBase - type.variacaoMaxima),
              maximo: type.precoBase + type.variacaoMaxima,
            },
            precoAtual: price?.preco ?? type.precoBase,
          };
        });
      }),

    setPrice: tenantProcedure
      .input(
        z.object({
          tenantId: z.number().optional(),
          inspectionTypeId: z.number(),
          preco: z.number().int().nonnegative(),
          observacoes: z.string().optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const tenantId = input.tenantId ?? ctx.user.tenantId;
        if (!tenantId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant não informado" });
        }
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const result = await db.setInspectionTypePrice({
          tenantId,
          inspectionTypeId: input.inspectionTypeId,
          preco: input.preco,
          observacoes: input.observacoes,
          ultimoAjustePor: ctx.user.id,
          ativo: input.ativo ?? true,
        });

        return result;
      }),
  }),

  // ============= PRICE CONFIGURATION ROUTES =============
  priceConfigurations: router({
    listByTenant: tenantProcedure.input(z.object({ tenantId: z.number() })).query(async ({ input, ctx }) => {
      // Verify user has access to this tenant
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.getPriceConfigurationsByTenant(input.tenantId);
    }),

    getByTenantAndService: publicProcedure
      .input(z.object({ tenantId: z.number(), serviceId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPriceByTenantAndService(input.tenantId, input.serviceId);
      }),

    create: tenantProcedure
      .input(
        z.object({
          tenantId: z.number(),
          serviceId: z.number(),
          preco: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.createPriceConfiguration(input);
      }),

    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          preco: z.number().optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updatePriceConfiguration(id, data);
      }),
  }),

  // ============= APPOINTMENT ROUTES =============
  appointments: router({
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getAppointmentById(input.id);
    }),

    listAll: adminProcedure.query(async () => {
      // Buscar todos os appointments para admin
      const tenants = await db.getAllTenants();
      const allAppointments = [];
      for (const tenant of tenants) {
        const appointments = await db.getAppointmentsByTenant(tenant.id);
        allAppointments.push(...appointments);
      }
      
      // Buscar dados de pagamento para cada appointment e corrigir status se necessário
      const appointmentsWithPayment = await Promise.all(
        allAppointments.map(async (apt) => {
          const payment = await db.getPaymentByAppointment(apt.id);
          
          // Se tem pagamento aprovado mas inspeção não está realizada, corrigir
          if (payment && payment.status === "aprovado" && apt.status !== "realizado") {
            console.log(`[Appointments] Corrigindo inspeção ${apt.id} - pagamento aprovado mas status não é realizado`);
            await db.updateAppointment(apt.id, {
              status: "realizado",
            });
            // Atualizar o objeto local
            apt.status = "realizado";
          }
          
          return {
            ...apt,
            payment,
          };
        })
      );
      
      return appointmentsWithPayment.sort((a, b) => b.dataAgendamento.getTime() - a.dataAgendamento.getTime());
    }),

    listByTenant: tenantProcedure.input(z.object({ tenantId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const appointments = await db.getAppointmentsByTenant(input.tenantId);
      
      // Para cada appointment, verificar se está vinculado a uma invoice com boleto e buscar inspection report
      const appointmentsWithInvoiceInfo = await Promise.all(
        appointments.map(async (apt) => {
          let invoiceInfo = null;
          if (apt.companyId) {
            invoiceInfo = await db.getInvoiceByAppointmentId(apt.id);
            if (invoiceInfo) {
              console.log(`[listByTenant] Inspeção ${apt.id}: invoiceInfo encontrada - boletoUrl=${invoiceInfo.boletoUrl ? 'SIM' : 'NÃO'}, id=${invoiceInfo.id}`);
            } else {
              console.log(`[listByTenant] Inspeção ${apt.id}: invoiceInfo NÃO encontrada (tem companyId=${apt.companyId})`);
            }
          }
          
          // Buscar inspection report se existir
          const inspectionReport = await db.getInspectionReportByAppointment(apt.id);
          
          return {
            ...apt,
            invoiceInfo: invoiceInfo ? {
              id: invoiceInfo.id,
              numero: invoiceInfo.numero,
              boletoUrl: invoiceInfo.boletoUrl,
              createdAt: invoiceInfo.createdAt,
            } : null,
            inspectionReport: inspectionReport ? {
              id: inspectionReport.id,
              pdfPath: inspectionReport.pdfPath,
              status: inspectionReport.status,
            } : null,
          };
        })
      );
      
      return appointmentsWithInvoiceInfo;
    }),

    listByCustomer: protectedProcedure.input(z.object({ customerId: z.number() })).query(async ({ input }) => {
      return await db.getAppointmentsByCustomer(input.customerId);
    }),

    create: publicProcedure
      .input(
        z.object({
          tenantId: z.number(),
          customerId: z.number(),
          vehicleId: z.number(),
          inspectionTypeId: z.number().optional(),
          inspectionScopeId: z.number(),
          detranAuthorizationId: z.number().optional(),
          professionalId: z.number().optional(),
          companyId: z.number().optional(), // ID da empresa que vai faturar esta inspeção
          dataAgendamento: z.coerce.date(), // Aceita string ISO e converte para Date
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createAppointment(input);
      }),

    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          dataAgendamento: z.date().optional(),
          status: z.enum(["pendente", "confirmado", "realizado", "cancelado"]).optional(),
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateAppointment(id, data);
      }),

    delete: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verificar se a inspeção pertence ao tenant do usuário
        const appointment = await db.getAppointmentById(input.id);
        if (!appointment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Inspeção não encontrada" });
        }
        
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== appointment.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para deletar esta inspeção" });
        }

        await db.deleteAppointment(input.id);
        return { success: true };
      }),
  }),

  // ============= PAYMENT ROUTES =============
  payments: router({
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const payment = await db.getPaymentById(input.id);
      if (!payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pagamento não encontrado" });
      }

      // Se tiver iuguPaymentId, buscar dados atualizados da fatura na IUGU para obter QR code
      if (payment.iuguPaymentId) {
        try {
          // Buscar tenant para obter token da subconta se necessário
          const appointment = await db.getAppointmentById(payment.appointmentId!);
          if (appointment) {
            const tenant = await db.getTenantById(appointment.tenantId);
            if (tenant) {
              // Obter token da subconta se disponível
              let subaccountApiToken: string | undefined = undefined;
              if ((tenant as any).iuguSubaccountToken) {
                subaccountApiToken = (tenant as any).iuguSubaccountToken;
              } else if (tenant.iuguAccountId) {
                const { obterTokenSubconta } = await import("./integrations/iugu");
                const token = await obterTokenSubconta(tenant.iuguAccountId);
                if (token) {
                  subaccountApiToken = token;
                }
              }

              const { consultarFatura } = await import("./integrations/iugu");
              const iuguInvoice = await consultarFatura(payment.iuguPaymentId, subaccountApiToken);
              
              console.log(`[Payments] Fatura consultada ${payment.iuguPaymentId}:`, {
                id: iuguInvoice.id,
                status: iuguInvoice.status,
                qr_code_pix: iuguInvoice.qr_code_pix,
                pix_qr_code: iuguInvoice.pix_qr_code,
                secure_url: iuguInvoice.secure_url,
              });
              
              return {
                ...payment,
                iuguInvoice: {
                  id: iuguInvoice.id,
                  status: iuguInvoice.status,
                  total_cents: iuguInvoice.total_cents,
                  paid_cents: iuguInvoice.paid_cents,
                  qr_code_pix: iuguInvoice.qr_code_pix || iuguInvoice.pix_qr_code || iuguInvoice.qr_code,
                  pix_qr_code: iuguInvoice.pix_qr_code || iuguInvoice.qr_code_pix || iuguInvoice.qr_code,
                  secure_url: iuguInvoice.secure_url,
                  paid_at: iuguInvoice.paid_at,
                },
              };
            }
          }
        } catch (error: any) {
          console.error(`[Payments] Erro ao buscar fatura IUGU ${payment.iuguPaymentId}:`, error.message);
          // Retornar payment mesmo se não conseguir buscar da IUGU
        }
      }

      return payment;
    }),

    getByAppointment: protectedProcedure.input(z.object({ appointmentId: z.number() })).query(async ({ input }) => {
      return await db.getPaymentByAppointment(input.appointmentId);
    }),

    createCharge: publicProcedure
      .input(
        z.object({
          appointmentId: z.number(),
          valorTotal: z.number(),
          metodoPagamento: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Buscar appointment e tenant
        const appointment = await db.getAppointmentById(input.appointmentId);
        if (!appointment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agendamento não encontrado" });
        }

        const tenant = await db.getTenantById(appointment.tenantId);
        if (!tenant) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Estabelecimento não encontrado" });
        }

        // Buscar customer
        const customer = await db.getCustomerById(appointment.customerId);
        if (!customer) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });
        }

        // Criar ou buscar customer na Iugu
        const { criarOuBuscarCustomer } = await import("./integrations/iugu");
        
        // Validar dados obrigatórios do cliente
        if (!customer.nome) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Cliente não possui nome cadastrado. Por favor, atualize os dados do cliente." 
          });
        }
        
        if (!customer.cpf) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Cliente não possui CPF cadastrado. Por favor, atualize os dados do cliente." 
          });
        }
        
        const iuguCustomerId = await criarOuBuscarCustomer({
          name: customer.nome,
          email: customer.email || undefined,
          phone: customer.telefone || undefined,
          cpf_cnpj: customer.cpf,
          external_reference: customer.id.toString(),
        });

        // Determinar método de pagamento
        const metodoPagamento = input.metodoPagamento?.toLowerCase();
        const isPix = metodoPagamento === "pix";
        const isCreditCard = metodoPagamento === "credit_card" || metodoPagamento === "card";

        // NOTA: Split de pagamento é gerenciado diretamente na IUGU
        // Se o tenant tiver iuguAccountId configurado, usar token da subconta para criar a fatura
        // Isso garante que o pagamento seja criado diretamente pela subconta
        console.log("[PAYMENT] Criando fatura sem splits no payload (split gerenciado pela configuração da IUGU)");
        console.log("[PAYMENT] Tenant iuguAccountId:", tenant.iuguAccountId || "não configurado");

        // Obter token da subconta: primeiro verificar se tem token direto, senão buscar via API
        let subaccountToken: string | undefined = undefined;
        if ((tenant as any).iuguSubaccountToken) {
          // Usar token direto se configurado
          subaccountToken = (tenant as any).iuguSubaccountToken;
          const tokenPreview = subaccountToken.substring(0, 8) + "***" + subaccountToken.substring(subaccountToken.length - 4);
          const tokenFirst12 = subaccountToken.substring(0, 12) + "..." + subaccountToken.substring(subaccountToken.length - 4);
          const tokenLast8 = subaccountToken.substring(subaccountToken.length - 8);
          console.log(`[PAYMENT] Usando token da subconta configurado diretamente: ${tokenPreview}`);
          console.log(`[PAYMENT] Token completo (primeiros 12 e últimos 4): ${tokenFirst12}`);
          console.log(`[PAYMENT] Últimos 8 caracteres do token: ${tokenLast8}`);
          console.log(`[PAYMENT] Comprimento do token: ${subaccountToken.length} caracteres`);
          console.log(`[PAYMENT] Token começa com: ${subaccountToken.substring(0, 8)}`);
          console.log(`[PAYMENT] Token termina com: ${subaccountToken.substring(subaccountToken.length - 4)}`);
        } else if (tenant.iuguAccountId) {
          // Fallback: buscar token via API
          try {
            const { obterTokenSubconta } = await import("./integrations/iugu");
            const token = await obterTokenSubconta(tenant.iuguAccountId);
            if (token) {
              subaccountToken = token;
              console.log("[PAYMENT] Token da subconta obtido via API");
            } else {
              console.warn("[PAYMENT] Não foi possível obter token da subconta, usando token principal");
            }
          } catch (error: any) {
            console.error("[PAYMENT] Erro ao obter token da subconta:", error.message);
            console.warn("[PAYMENT] Continuando com token principal");
          }
        }

        // Criar fatura na Iugu usando token da subconta se disponível
        // Aplicar split global para conta master se configurado
        const { criarFatura } = await import("./integrations/iugu");
        
        // Buscar configuração de split global
        const splitConfig = await db.getSystemConfig("iugu_global_split_percent");
        const masterAccountIdConfig = await db.getSystemConfig("iugu_master_account_id");
        const splitPercent = splitConfig ? parseFloat(splitConfig.value) : 0;
        const masterAccountId = masterAccountIdConfig?.value || "";
        
        // Preparar splits se houver configuração
        const splits: any[] = [];
        if (splitPercent > 0 && masterAccountId && subaccountToken) {
          // Apenas aplicar split se estiver usando token da subconta
          // O split vai para a conta master
          splits.push({
            recipient_account_id: masterAccountId,
            percent: splitPercent,
          });
          console.log(`[PAYMENT] Aplicando split global de ${splitPercent}% para conta master ${masterAccountId}`);
        }
        
        // IMPORTANTE: Criar a fatura com o método específico escolhido pelo usuário
        // Usar payable_with em vez de method (method é legado e pode não funcionar)
        let payableWith: string | undefined;
        if (isPix) {
          payableWith = "pix";
        } else if (isCreditCard) {
          payableWith = "credit_card";
        } else {
          // Se não especificou método, permitir ambos (usuário escolhe depois)
          payableWith = "credit_card,pix";
        }
        
        // Usar data atual ou futura (não pode estar no passado)
        // Sempre usar a data de hoje em UTC para garantir que não está no passado
        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        // Formatar como YYYY-MM-DD sem problemas de fuso horário
        const dueDateStr = `${todayUTC.getUTCFullYear()}-${String(todayUTC.getUTCMonth() + 1).padStart(2, '0')}-${String(todayUTC.getUTCDate()).padStart(2, '0')}`;
        
        const iuguInvoice = await criarFatura(
          {
            email: customer.email || undefined,
            due_date: dueDateStr,
            // Usar o método específico escolhido pelo usuário (payable_with é o parâmetro correto)
            payable_with: payableWith,
            items: [
              {
                description: `Agendamento #${appointment.id} - Inspeção Veicular`,
                quantity: 1,
                price_cents: input.valorTotal,
              },
            ],
            splits: splits.length > 0 ? splits : undefined, // Aplicar split global se configurado
            payer: {
              name: customer.nome,
              email: customer.email || undefined,
              phone: customer.telefone || undefined,
              cpf_cnpj: customer.cpf,
            },
            notification_url: process.env.IUGU_WEBHOOK_URL || undefined,
          },
          subaccountToken
        );
        
        console.log("[PAYMENT] Fatura criada na IUGU:", iuguInvoice.id);
        console.log("[PAYMENT] Fatura criada usando:", subaccountToken ? "token da subconta" : "token principal");
        console.log("[PAYMENT] Splits retornados pela IUGU:", JSON.stringify(iuguInvoice.splits || [], null, 2));
        console.log("[PAYMENT] QR Code PIX disponível:", !!(iuguInvoice.qr_code_pix || iuguInvoice.pix_qr_code));
        console.log("[PAYMENT] Dados completos da fatura:", JSON.stringify({
          id: iuguInvoice.id,
          status: iuguInvoice.status,
          method: isPix ? "pix" : "bank_slip",
          qr_code_pix: iuguInvoice.qr_code_pix,
          pix_qr_code: iuguInvoice.pix_qr_code,
          secure_url: iuguInvoice.secure_url,
        }, null, 2));

        // Salvar payment no banco
        const payment = await db.createPayment({
          appointmentId: input.appointmentId,
          valorTotal: input.valorTotal,
          metodoPagamento: input.metodoPagamento,
          iuguPaymentId: iuguInvoice.id,
        });

        // Payment splits não são mais criados aqui
        // O split é gerenciado diretamente pela IUGU

        // Determinar URL de pagamento
        const paymentUrl = isPix 
          ? iuguInvoice.qr_code_pix || iuguInvoice.pix_qr_code || iuguInvoice.secure_url
          : iuguInvoice.secure_url || "#";

        // Buscar accountId da conta principal para tokenização do Iugu JS
        // O Iugu JS pode precisar do accountId da conta principal mesmo quando o pagamento é processado pela subconta
        let masterAccountIdForTokenization: string | undefined = undefined;
        try {
          // Primeiro, tentar buscar da configuração do banco de dados
          const masterAccountIdConfig = await db.getSystemConfig("iugu_master_account_id");
          masterAccountIdForTokenization = masterAccountIdConfig?.value || undefined;
          if (masterAccountIdForTokenization) {
            console.log("[PAYMENT] AccountId da conta principal obtido da configuração para tokenização:", masterAccountIdForTokenization.substring(0, 8) + "***");
          } else {
            console.warn("[PAYMENT] Configuração iugu_master_account_id não encontrada no banco de dados. Tentando buscar via API...");
            // Se não estiver na configuração, tentar buscar via API como fallback
            try {
              const { ENV } = await import("./_core/env");
              const axios = (await import("axios")).default;
              const { getAuthHeaders } = await import("./integrations/iugu");
              const IUGU_API_URL = "https://api.iugu.com/v1";
              
              const accountResponse = await axios.get(`${IUGU_API_URL}/account`, {
                headers: getAuthHeaders(),
              });
              masterAccountIdForTokenization = accountResponse.data?.id || undefined;
              if (masterAccountIdForTokenization) {
                console.log("[PAYMENT] AccountId da conta principal obtido via API para tokenização:", masterAccountIdForTokenization.substring(0, 8) + "***");
              }
            } catch (apiError: any) {
              console.warn("[PAYMENT] Erro ao buscar accountId da conta principal via API:", apiError.message);
            }
          }
        } catch (error: any) {
          console.warn("[PAYMENT] Erro ao buscar accountId da conta principal:", error.message);
          // Continuar sem o accountId da conta principal
        }

        return {
          ...payment,
          iuguInvoice,
          paymentUrl,
          qrCode: isPix ? (iuguInvoice.qr_code_pix || iuguInvoice.pix_qr_code) : undefined,
          accountId: tenant.iuguAccountId || undefined, // AccountId da subconta
          masterAccountId: masterAccountIdForTokenization || undefined, // AccountId da conta principal para tokenização do Iugu JS
          invoiceId: iuguInvoice.id, // Retornar invoiceId para checkout próprio
          totalCents: iuguInvoice.total_cents, // Retornar total para checkout próprio
          useOwnCheckout: true, // Indicar que usamos checkout próprio
        };
      }),

    create: publicProcedure
      .input(
        z.object({
          appointmentId: z.number(),
          valorTotal: z.number(),
          metodoPagamento: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createPayment(input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pendente", "processando", "aprovado", "recusado", "estornado"]).optional(),
          asaasPaymentId: z.string().optional(),
          dataPagamento: z.date().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updatePayment(id, data);
      }),

    consultarStatus: publicProcedure.input(z.object({ paymentId: z.number() })).query(async ({ input }) => {
      const payment = await db.getPaymentById(input.paymentId);
      if (!payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pagamento não encontrado" });
      }

      // Se tem iuguPaymentId, consultar na Iugu
      if (payment.iuguPaymentId) {
        // Buscar tenant para obter token da subconta se necessário
        let subaccountApiToken: string | undefined = undefined;
        if (payment.appointmentId) {
          const appointment = await db.getAppointmentById(payment.appointmentId);
          if (appointment) {
            const tenant = await db.getTenantById(appointment.tenantId);
            if (tenant) {
              // Obter token da subconta se disponível
              if ((tenant as any).iuguSubaccountToken) {
                subaccountApiToken = (tenant as any).iuguSubaccountToken;
              } else if (tenant.iuguAccountId) {
                const { obterTokenSubconta } = await import("./integrations/iugu");
                const token = await obterTokenSubconta(tenant.iuguAccountId);
                if (token) {
                  subaccountApiToken = token;
                }
              }
            }
          }
        }

        const { consultarFatura } = await import("./integrations/iugu");
        try {
          const iuguInvoice = await consultarFatura(payment.iuguPaymentId, subaccountApiToken);
          
          // Mapear status da Iugu para nosso sistema
          const statusMap: Record<string, "pendente" | "processando" | "aprovado" | "recusado" | "estornado"> = {
            pending: "pendente",
            processing: "processando",
            paid: "aprovado",
            canceled: "recusado",
            refunded: "estornado",
            expired: "recusado",
          };

          const novoStatus = statusMap[iuguInvoice.status] || "pendente";

          // Atualizar status no banco se mudou
          if (novoStatus !== payment.status) {
            console.log(`[Payments] Atualizando payment ${payment.id} de "${payment.status}" para "${novoStatus}"`);
            await db.updatePayment(input.paymentId, {
              status: novoStatus,
              dataPagamento: iuguInvoice.paid_at ? new Date(iuguInvoice.paid_at) : undefined,
            });
            
            // Se foi aprovado, marcar inspeção como realizada
            if (novoStatus === "aprovado" && payment.appointmentId) {
              const appointment = await db.getAppointmentById(payment.appointmentId);
              if (appointment && appointment.status !== "realizado") {
                await db.updateAppointment(payment.appointmentId, {
                  status: "realizado",
                });
                console.log(`[Payments] Inspeção ${payment.appointmentId} marcada como realizada`);
              }
            }
          }

          return {
            status: novoStatus,
            paid_at: iuguInvoice.paid_at,
            invoice: iuguInvoice,
          };
        } catch (error: any) {
          console.error(`[Payments] Erro ao consultar fatura Iugu ${payment.iuguPaymentId}:`, error.message);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Erro ao consultar status: ${error.message}` });
        }
      }

      // Se tem asaasPaymentId, consultar no ASAAS (compatibilidade)
      if (payment.asaasPaymentId) {
        const { consultarPagamento } = await import("./integrations/asaas");
        const asaasPayment = await consultarPagamento(payment.asaasPaymentId);

        // Atualizar status no banco se mudou
        if (asaasPayment.status !== payment.status) {
          const statusMap: Record<string, "pendente" | "processando" | "aprovado" | "recusado" | "estornado"> = {
            PENDING: "pendente",
            CONFIRMED: "processando",
            RECEIVED: "aprovado",
            REFUNDED: "estornado",
            OVERDUE: "pendente",
          };
          await db.updatePayment(input.paymentId, {
            status: statusMap[asaasPayment.status] || payment.status,
            dataPagamento: asaasPayment.paymentDate ? new Date(asaasPayment.paymentDate) : undefined,
          });
        }

        return asaasPayment;
      }

      throw new TRPCError({ code: "NOT_FOUND", message: "Pagamento não possui ID de integração" });
    }),

    processCardPayment: publicProcedure
      .input(
        z.object({
          paymentId: z.number(),
          token: z.string(), // Token do cartão gerado pelo IUGU JS (obrigatório - dados sensíveis não devem ser enviados ao backend)
          installments: z.number().optional().default(1),
        })
      )
      .mutation(async ({ input }) => {
        const payment = await db.getPaymentById(input.paymentId);
        if (!payment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pagamento não encontrado" });
        }

        if (!payment.iuguPaymentId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Pagamento não possui ID da IUGU" });
        }

        // Buscar appointment e tenant para obter token da subconta
        const appointment = await db.getAppointmentById(payment.appointmentId!);
        if (!appointment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agendamento não encontrado" });
        }

        const tenant = await db.getTenantById(appointment.tenantId);
        if (!tenant) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Estabelecimento não encontrado" });
        }

        // Obter token da subconta: primeiro verificar se tem token direto, senão buscar via API
        console.log(`[PAYMENT] Tenant encontrado: ID=${tenant.id}, Nome=${tenant.nome || 'N/A'}, iuguAccountId=${tenant.iuguAccountId || 'N/A'}, iuguSubaccountToken=${(tenant as any).iuguSubaccountToken ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}`);
        
        let subaccountApiToken: string | undefined = undefined;
        if ((tenant as any).iuguSubaccountToken) {
          // Usar token direto se configurado
          subaccountApiToken = (tenant as any).iuguSubaccountToken;
          if (subaccountApiToken) {
            const tokenPreview = subaccountApiToken.substring(0, 8) + "***" + subaccountApiToken.substring(subaccountApiToken.length - 4);
            console.log(`[PAYMENT] Processando pagamento com cartão usando token da subconta configurado diretamente: ${tokenPreview}`);
            console.log(`[PAYMENT] Token completo (primeiros 12 e últimos 4): ${subaccountApiToken.substring(0, 12)}...${subaccountApiToken.substring(subaccountApiToken.length - 4)}`);
          }
        } else if (tenant.iuguAccountId) {
          // Fallback: buscar token via API
          const { obterTokenSubconta } = await import("./integrations/iugu");
          const token = await obterTokenSubconta(tenant.iuguAccountId);
          if (token) {
            subaccountApiToken = token;
            const tokenPreview = subaccountApiToken.substring(0, 8) + "***" + subaccountApiToken.substring(subaccountApiToken.length - 4);
            console.log(`[PAYMENT] Processando pagamento com cartão usando token da subconta obtido via API: ${tokenPreview}`);
            console.log(`[PAYMENT] Token completo (primeiros 12 e últimos 4): ${subaccountApiToken.substring(0, 12)}...${subaccountApiToken.substring(subaccountApiToken.length - 4)}`);
          } else {
            console.warn(`[PAYMENT] Não foi possível obter token da subconta ${tenant.iuguAccountId}, usando token principal`);
          }
        } else {
          console.warn(`[PAYMENT] Tenant não possui iuguSubaccountToken nem iuguAccountId configurado, usando token principal`);
        }
        
        // Log final do token que será usado
        if (subaccountApiToken) {
          const tokenPreview = subaccountApiToken.substring(0, 8) + "***" + subaccountApiToken.substring(subaccountApiToken.length - 4);
          console.log(`[PAYMENT] Token da subconta que será usado para processar o pagamento: ${tokenPreview}`);
          console.log(`[PAYMENT] Token completo (primeiros 12 e últimos 4): ${subaccountApiToken.substring(0, 12)}...${subaccountApiToken.substring(subaccountApiToken.length - 4)}`);
        } else {
          console.log(`[PAYMENT] Usando token principal (master account) para processar o pagamento`);
        }

        // VERIFICAR: Se a inspeção está vinculada a uma empresa, não permitir pagamento
        // Inspeções vinculadas a empresas devem ser faturadas apenas via boleto
        if (appointment.companyId) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Esta inspeção está vinculada a uma empresa e deve ser faturada via boleto. Não é possível fazer pagamento direto." 
          });
        }

        // Processar pagamento com cartão na IUGU
        // IMPORTANTE: Se a fatura existente não aceitar cartão, criar uma nova fatura com method: "credit_card"
        const { processarPagamentoCartao, consultarFatura, criarFatura } = await import("./integrations/iugu");
        
        // IMPORTANTE: Sempre criar uma nova fatura específica para cartão
        // Mesmo que a fatura original tenha "credit_card,pix", a Iugu pode não processar corretamente
        // Criar uma fatura dedicada garante que o pagamento com cartão funcione corretamente
        let invoiceToUse = payment.iuguPaymentId!;
        let needsNewInvoice = true; // Sempre criar nova fatura para cartão
        
        try {
          const currentInvoice = await consultarFatura(payment.iuguPaymentId!, subaccountApiToken);
          const invoiceMethod = (currentInvoice as any).method;
          const payableWith = (currentInvoice as any).payable_with || invoiceMethod;
          
          // Verificar se a fatura já foi criada ESPECIFICAMENTE para cartão (não "credit_card,pix")
          const isCardOnly = 
            (payableWith === "credit_card" && invoiceMethod !== "pix") ||
            invoiceMethod === "credit_card";
          
          if (isCardOnly) {
            // Se já é uma fatura específica para cartão, usar ela
            console.log(`[PAYMENT] Fatura atual já é específica para cartão. method: "${invoiceMethod || 'undefined'}", payable_with: "${JSON.stringify(payableWith)}". Usando fatura existente.`);
            needsNewInvoice = false;
          } else {
            // Se não é específica para cartão (tem "pix" junto ou é só PIX), criar nova
            console.log(`[PAYMENT] Fatura atual não é específica para cartão. method: "${invoiceMethod || 'undefined'}", payable_with: "${JSON.stringify(payableWith)}". Criando nova fatura dedicada para cartão...`);
            needsNewInvoice = true;
          }
        } catch (error) {
          console.log(`[PAYMENT] Erro ao consultar fatura, criando nova fatura para cartão:`, error);
          needsNewInvoice = true;
        }
        
        // Se precisar criar nova fatura, criar com method: "credit_card"
        if (needsNewInvoice) {
          const customer = await db.getCustomerById(appointment.customerId!);
          if (!customer) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });
          }
          
          // Buscar configuração de split global (mesma lógica do createCharge)
          const splitConfig = await db.getSystemConfig("iugu_global_split_percent");
          const masterAccountIdConfig = await db.getSystemConfig("iugu_master_account_id");
          const splitPercent = splitConfig?.value ? parseFloat(splitConfig.value) : 0;
          const masterAccountId = masterAccountIdConfig?.value || "";
          
          // Preparar splits se houver configuração
          const splits: any[] = [];
          if (splitPercent > 0 && masterAccountId && subaccountApiToken) {
            splits.push({
              recipient_account_id: masterAccountId,
              percent: splitPercent,
            });
            console.log(`[PAYMENT] Aplicando split global de ${splitPercent}% para conta master ${masterAccountId} na nova fatura de cartão`);
          }
          
          // Criar nova fatura especificamente para cartão
          // Usar data atual ou futura (não pode estar no passado)
          // Sempre usar a data de hoje em UTC para garantir que não está no passado
          const today = new Date();
          const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
          // Formatar como YYYY-MM-DD sem problemas de fuso horário
          const dueDateStr = `${todayUTC.getUTCFullYear()}-${String(todayUTC.getUTCMonth() + 1).padStart(2, '0')}-${String(todayUTC.getUTCDate()).padStart(2, '0')}`;
          
          const newInvoice = await criarFatura(
            {
              email: customer.email || undefined,
              due_date: dueDateStr,
              payable_with: "credit_card", // Criar especificamente para cartão (usar payable_with em vez de method)
              items: [
                {
                  description: `Agendamento #${appointment.id} - Inspeção Veicular`,
                  quantity: 1,
                  price_cents: payment.valorTotal,
                },
              ],
              splits: splits.length > 0 ? splits : undefined, // Aplicar split global se configurado
              payer: {
                name: customer.nome,
                email: customer.email || undefined,
                phone: customer.telefone || undefined,
                cpf_cnpj: customer.cpf,
              },
              notification_url: process.env.IUGU_WEBHOOK_URL || undefined,
            },
            subaccountApiToken
          );
          
          invoiceToUse = newInvoice.id;
          
          // Atualizar payment com o novo invoice ID
          await db.updatePayment(input.paymentId, {
            iuguPaymentId: newInvoice.id,
          });
          
          console.log(`[PAYMENT] Nova fatura criada para cartão: ${newInvoice.id}`);
        }
        
        // Processar com token (fluxo obrigatório - tokenizado pelo IUGU JS no frontend)
        console.log("[PAYMENT] Processando pagamento com token tokenizado");
        console.log("[PAYMENT] Processando pagamento com token:", {
          paymentId: input.paymentId,
          invoiceId: invoiceToUse,
          tokenPreview: input.token.substring(0, 8) + "***" + input.token.substring(input.token.length - 4),
          tokenLength: input.token.length,
          installments: input.installments || 1,
        });

        // Buscar dados do cliente para incluir no payload do /charge
        const customer = await db.getCustomerById(appointment.customerId!);
        if (!customer) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });
        }

        // IMPORTANTE: Não buscar items da fatura para incluir no payload
        // A Iugu não permite cobrar items e fatura ao mesmo tempo
        // Quando temos invoice_id, os items já estão na fatura e não devem ser enviados novamente

        const result = await processarPagamentoCartao(
          {
            invoice_id: invoiceToUse,
            token: input.token,
            installments: input.installments || 1,
            // Incluir dados do cliente conforme documentação da Iugu
            payer: {
              name: customer.nome,
              cpf_cnpj: customer.cpf || undefined,
            },
            email: customer.email || undefined,
            // NÃO incluir items - quando temos invoice_id, os items já estão na fatura
            // Enviar items junto com invoice_id causa erro: "Não é possivel cobrar itens e fatura ao mesmo tempo"
          },
          subaccountApiToken
        );

        console.log("[PAYMENT] Resultado do processamento:", {
          success: result.success,
          invoiceId: result.invoice?.id,
          invoiceStatus: result.invoice?.status,
          errors: result.errors,
          message: result.message,
          LR: (result as any).LR,
          status: (result as any).status,
        });

        if (result.success && result.invoice) {
          // Atualizar status do pagamento
          const statusMap: Record<string, "pendente" | "processando" | "aprovado" | "recusado" | "estornado"> = {
            pending: "pendente",
            processing: "processando",
            paid: "aprovado",
            canceled: "recusado",
            refunded: "estornado",
            expired: "recusado",
          };

          const novoStatus = statusMap[result.invoice.status] || "processando";
          await db.updatePayment(input.paymentId, {
            status: novoStatus,
            dataPagamento: result.invoice.paid_at ? new Date(result.invoice.paid_at) : undefined,
            metodoPagamento: "credit_card", // Salvar método de pagamento como cartão de crédito
          });

          // Marcar inspeção como realizada se pagamento foi aprovado
          if (novoStatus === "aprovado" && payment.appointmentId) {
            const appointment = await db.getAppointmentById(payment.appointmentId);
            if (appointment && appointment.status !== "realizado") {
              await db.updateAppointment(payment.appointmentId, {
                status: "realizado",
              });
              console.log(`[PAYMENT] Inspeção ${payment.appointmentId} marcada como realizada`);
            }
          }

          return {
            success: true,
            message: "Pagamento processado com sucesso!",
            invoice: result.invoice,
          };
        } else {
          // Usar a mensagem já formatada pelo processarPagamentoCartao
          // que já inclui tratamento para códigos LR
          const errorMessage = result.message || "Erro ao processar pagamento";
          
          // Log detalhado para debug
          console.error(`[PAYMENT] ========== ERRO NO PROCESSAMENTO DO CARTÃO ==========`);
          console.error(`[PAYMENT] Success: ${result.success}`);
          console.error(`[PAYMENT] Message: ${errorMessage}`);
          console.error(`[PAYMENT] LR: ${(result as any).LR || 'N/A'}`);
          console.error(`[PAYMENT] Status: ${(result as any).status || 'N/A'}`);
          console.error(`[PAYMENT] Errors: ${JSON.stringify(result.errors || 'N/A', null, 2)}`);
          console.error(`[PAYMENT] Invoice ID usado: ${invoiceToUse}`);
          console.error(`[PAYMENT] Token usado: ${subaccountApiToken ? 'subconta' : 'principal'}`);
          console.error(`[PAYMENT] =====================================================`);
          
          return {
            success: false,
            message: errorMessage,
            errors: result.errors,
            LR: (result as any).LR,
            status: (result as any).status,
            infoMessage: (result as any).infoMessage,
          };
        }
      }),

    sincronizarStatus: adminProcedure.mutation(async () => {
      // Buscar todos os pagamentos pendentes com iuguPaymentId
      const allPayments = await db.getAllPayments();
      const pendingPayments = allPayments.filter(p => 
        p.status === "pendente" && p.iuguPaymentId
      );

      console.log(`[Payments] Sincronizando ${pendingPayments.length} pagamentos pendentes`);

      const { consultarFatura } = await import("./integrations/iugu");
      let atualizados = 0;
      let erros = 0;

      for (const payment of pendingPayments) {
        try {
          // Obter token da subconta se disponível
          let subaccountApiToken: string | undefined = undefined;
          if (payment.appointmentId) {
            const appointment = await db.getAppointmentById(payment.appointmentId);
            if (appointment) {
              const tenant = await db.getTenantById(appointment.tenantId);
              if ((tenant as any)?.iuguSubaccountToken) {
                subaccountApiToken = (tenant as any).iuguSubaccountToken;
              } else if (tenant?.iuguAccountId) {
                try {
                  const { obterTokenSubconta } = await import("./integrations/iugu");
                  subaccountApiToken = await obterTokenSubconta(tenant.iuguAccountId) || undefined;
                } catch (error: any) {
                  console.warn(`[Payments] Erro ao obter token da subconta para payment ${payment.id}:`, error.message);
                }
              }
            }
          }

          const iuguInvoice = await consultarFatura(payment.iuguPaymentId!, subaccountApiToken);
          
          const statusMap: Record<string, "pendente" | "processando" | "aprovado" | "recusado" | "estornado"> = {
            pending: "pendente",
            processing: "processando",
            paid: "aprovado",
            canceled: "recusado",
            refunded: "estornado",
            expired: "recusado",
          };

          const novoStatus = statusMap[iuguInvoice.status] || "pendente";

          if (novoStatus !== payment.status) {
            console.log(`[Payments] Atualizando payment ${payment.id} de "${payment.status}" para "${novoStatus}"`);
            await db.updatePayment(payment.id, {
              status: novoStatus,
              dataPagamento: iuguInvoice.paid_at ? new Date(iuguInvoice.paid_at) : undefined,
            });
            
            // Se foi aprovado, marcar inspeção como realizada
            if (novoStatus === "aprovado" && payment.appointmentId) {
              const appointment = await db.getAppointmentById(payment.appointmentId);
              if (appointment && appointment.status !== "realizado") {
                await db.updateAppointment(payment.appointmentId, {
                  status: "realizado",
                });
                console.log(`[Payments] Inspeção ${payment.appointmentId} marcada como realizada`);
              }
            }
            
            atualizados++;
          }
        } catch (error: any) {
          console.error(`[Payments] Erro ao sincronizar payment ${payment.id}:`, error.message);
          erros++;
        }
      }

      // Corrigir inspeções que têm pagamentos aprovados mas não estão marcadas como realizadas
      console.log(`[Payments] Corrigindo inspeções com pagamentos aprovados...`);
      const approvedPayments = allPayments.filter(p => p.status === "aprovado" && p.appointmentId);
      let inspecoesCorrigidas = 0;

      for (const payment of approvedPayments) {
        try {
          const appointment = await db.getAppointmentById(payment.appointmentId!);
          if (appointment && appointment.status !== "realizado") {
            await db.updateAppointment(payment.appointmentId!, {
              status: "realizado",
            });
            console.log(`[Payments] Inspeção ${payment.appointmentId} corrigida para realizada`);
            inspecoesCorrigidas++;
          }
        } catch (error: any) {
          console.error(`[Payments] Erro ao corrigir inspeção ${payment.appointmentId}:`, error.message);
        }
      }

      return {
        total: pendingPayments.length,
        atualizados,
        erros,
        inspecoesCorrigidas,
      };
    }),

    atualizarStatusManual: tenantProcedure
      .input(z.object({ paymentId: z.number() }))
      .mutation(async ({ input }) => {
        const payment = await db.getPaymentById(input.paymentId);
        if (!payment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pagamento não encontrado" });
        }

        if (!payment.iuguPaymentId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Pagamento não possui ID da IUGU" });
        }

        // Buscar appointment e tenant para obter token da subconta
        let subaccountApiToken: string | undefined = undefined;
        if (payment.appointmentId) {
          try {
            const appointment = await db.getAppointmentById(payment.appointmentId);
            if (appointment) {
              const tenant = await db.getTenantById(appointment.tenantId);
              if ((tenant as any)?.iuguSubaccountToken) {
                subaccountApiToken = (tenant as any).iuguSubaccountToken;
              } else if (tenant?.iuguAccountId) {
                const { obterTokenSubconta } = await import("./integrations/iugu");
                subaccountApiToken = await obterTokenSubconta(tenant.iuguAccountId) || undefined;
              }
            }
          } catch (error: any) {
            console.warn("[Payments] Erro ao obter token da subconta para atualização manual:", error.message);
          }
        }

        const { consultarFatura } = await import("./integrations/iugu");
        const iuguInvoice = await consultarFatura(payment.iuguPaymentId, subaccountApiToken);
        
        const statusMap: Record<string, "pendente" | "processando" | "aprovado" | "recusado" | "estornado"> = {
          pending: "pendente",
          processing: "processando",
          paid: "aprovado",
          canceled: "recusado",
          refunded: "estornado",
          expired: "recusado",
        };

        const novoStatus = statusMap[iuguInvoice.status] || "pendente";

        await db.updatePayment(input.paymentId, {
          status: novoStatus,
          dataPagamento: iuguInvoice.paid_at ? new Date(iuguInvoice.paid_at) : undefined,
        });
        
        // Se foi aprovado, marcar inspeção como realizada
        if (novoStatus === "aprovado" && payment.appointmentId) {
          const appointment = await db.getAppointmentById(payment.appointmentId);
          if (appointment && appointment.status !== "realizado") {
            await db.updateAppointment(payment.appointmentId, {
              status: "realizado",
            });
            console.log(`[Payments] Inspeção ${payment.appointmentId} marcada como realizada`);
          }
        }

      return {
        paymentId: input.paymentId,
        statusAnterior: payment.status,
        statusNovo: novoStatus,
        iuguStatus: iuguInvoice.status,
      };
      }),
  }),

  // ============= AUDIT LOG ROUTES =============
  auditLogs: router({
    list: adminProcedure
      .input(
        z
          .object({
            action: z.enum(["create", "update", "delete", "login", "logout"]).optional(),
            userId: z.number().optional(),
            tenantId: z.number().optional(),
            limit: z.number().optional().default(100),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const filters = input || {};
        return await db.getAuditLogs(filters);
      }),

    listByTenant: tenantProcedure
      .input(
        z.object({
          tenantId: z.number(),
          limit: z.number().optional().default(100),
        })
      )
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getAuditLogsByTenant(input.tenantId, input.limit);
      }),

    listByUser: protectedProcedure.input(z.object({ userId: z.number(), limit: z.number().optional() })).query(async ({ input }) => {
      return await db.getAuditLogsByUser(input.userId, input.limit);
    }),

    create: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          tenantId: z.number().optional(),
          acao: z.string(),
          modulo: z.string(),
          entidade: z.string().optional(),
          entidadeId: z.number().optional(),
          dadosAntigos: z.any().optional(),
          dadosNovos: z.any().optional(),
          ipAddress: z.string().optional(),
          userAgent: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createAuditLog(input);
      }),
  }),

  // ============= PAYMENT SPLIT ROUTES =============
  paymentSplits: router({
    listByPayment: protectedProcedure.input(z.object({ paymentId: z.number() })).query(async ({ input }) => {
      return await db.getPaymentSplitsByPayment(input.paymentId);
    }),

    listByTenant: tenantProcedure.input(z.object({ tenantId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.getPaymentSplitsByTenant(input.tenantId);
    }),

    create: protectedProcedure
      .input(
        z.object({
          paymentId: z.number(),
          tenantId: z.number(),
          valor: z.number(),
          percentual: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createPaymentSplit(input);
      }),
  }),

  // ============= SPLIT CONFIGURATION ROUTES =============
  splitConfigurations: router({
    listByTenant: tenantProcedure.input(z.object({ tenantId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.getSplitConfigurationsByTenant(input.tenantId);
    }),

    getByTenantAndService: tenantProcedure
      .input(z.object({ tenantId: z.number(), serviceId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getSplitConfigByTenantAndService(input.tenantId, input.serviceId);
      }),

    create: tenantProcedure
      .input(
        z.object({
          tenantId: z.number(),
          serviceId: z.number(),
          percentualTenant: z.number(),
          percentualPlataforma: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.createSplitConfiguration(input);
      }),

    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          percentualTenant: z.number().optional(),
          percentualPlataforma: z.number().optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateSplitConfiguration(id, data);
      }),
  }),

  // ============= WHATSAPP MESSAGE ROUTES =============
  whatsappMessages: router({
    listByCustomer: protectedProcedure.input(z.object({ customerId: z.number() })).query(async ({ input }) => {
      return await db.getWhatsappMessagesByCustomer(input.customerId);
    }),

    listByTenant: tenantProcedure.input(z.object({ tenantId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.getWhatsappMessagesByTenant(input.tenantId);
    }),

    create: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          tenantId: z.number().optional(),
          appointmentId: z.number().optional(),
          mensagem: z.string(),
          direcao: z.enum(["enviada", "recebida"]),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createWhatsappMessage(input);
      }),
  }),

  // ============= FINANCIAL RECONCILIATION ROUTES =============
  financialReconciliations: router({
    listByTenant: tenantProcedure.input(z.object({ tenantId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.getFinancialReconciliationsByTenant(input.tenantId);
    }),

    create: tenantProcedure
      .input(
        z.object({
          tenantId: z.number(),
          dataInicio: z.date(),
          dataFim: z.date(),
          valorTotal: z.number(),
          quantidadeTransacoes: z.number(),
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.createFinancialReconciliation(input);
      }),

    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["aberto", "fechado", "conciliado"]).optional(),
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateFinancialReconciliation(id, data);
      }),
  }),

  // ============= DASHBOARD ROUTES =============
  dashboard: router({
    stats: adminProcedure.query(async () => {
      const allTenants = await db.getAllTenants();
      const allUsers = await db.getAllUsers();
      const activeUsers = allUsers.filter(u => u.role !== "admin" && u.tenantId);
      
      // Buscar agendamentos do mês atual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const allAppointments = [];
      for (const tenant of allTenants) {
        const appointments = await db.getAppointmentsByTenant(tenant.id);
        allAppointments.push(...appointments);
      }
      
      const appointmentsThisMonth = allAppointments.filter(apt => {
        const aptDate = new Date(apt.dataAgendamento);
        return aptDate >= startOfMonth && aptDate <= endOfMonth;
      });
      
      // Buscar pagamentos do mês atual para calcular receita
      const allPayments = await db.getAllPayments();
      const paymentsThisMonth = allPayments.filter(payment => {
        if (!payment.dataPagamento) return false;
        const paymentDate = new Date(payment.dataPagamento);
        return paymentDate >= startOfMonth && paymentDate <= endOfMonth && payment.status === "aprovado";
      });
      
      const revenueThisMonth = paymentsThisMonth.reduce((sum, payment) => sum + (payment.valorTotal || 0), 0);
      
      // Buscar agendamentos recentes (últimos 10) com dados completos
      const recentAppointmentsWithDetails = [];
      const sortedAppointments = allAppointments
        .sort((a, b) => new Date(b.dataAgendamento).getTime() - new Date(a.dataAgendamento).getTime())
        .slice(0, 10);
      
      for (const apt of sortedAppointments) {
        const customer = await db.getCustomerById(apt.customerId);
        const vehicle = await db.getVehicleById(apt.vehicleId);
        const tenant = allTenants.find(t => t.id === apt.tenantId);
        recentAppointmentsWithDetails.push({
          ...apt,
          customer: customer || null,
          vehicle: vehicle || null,
          tenant: tenant || null,
        });
      }
      
      return {
        totalTenants: allTenants.length,
        totalAppointmentsThisMonth: appointmentsThisMonth.length,
        totalActiveUsers: activeUsers.length,
        revenueThisMonth: revenueThisMonth,
        recentAppointments: recentAppointmentsWithDetails,
      };
    }),
  }),

  // ============= REPORT ROUTES =============
  reports: router({
    listByTenant: tenantProcedure.input(z.object({ tenantId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.getReportsByTenant(input.tenantId);
    }),

    listAll: adminProcedure.query(async () => {
      return await db.getAllReports();
    }),

    create: protectedProcedure
      .input(
        z.object({
          tenantId: z.number().optional(),
          nome: z.string(),
          tipo: z.string(),
          parametros: z.any().optional(),
          dados: z.any().optional(),
          geradoPor: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createReport(input);
      }),

    getDailyAppointments: tenantProcedure
      .input(
        z.object({
          tenantId: z.number(),
          date: z.string(), // ISO date string
        })
      )
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const date = new Date(input.date);
        return await db.getAppointmentsByDate(input.tenantId, date);
      }),
  }),

  // ============= USER MANAGEMENT ROUTES =============
  users: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    listByTenant: tenantProcedure.input(z.object({ tenantId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.getUsersByTenant(input.tenantId);
    }),

    getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getUserById(input.id);
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string(),
          email: z.string().email(),
          password: z.string().min(6),
          role: z.enum(["admin", "operator", "user"]),
          tenantId: z.number().optional(),
          comissaoPercentual: z.number().min(0).max(100).optional(),
          aptoParaAtender: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Verificar se já existe usuário com este email
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Já existe um usuário com este e-mail" });
        }

        // Criar openId único baseado no email
        const openId = `manual-${input.email}`;
        
        // Verificar se já existe openId
        const existingByOpenId = await db.getUserByOpenId(openId);
        if (existingByOpenId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Já existe um usuário com este identificador" });
        }

        // Hash da senha
        const bcrypt = await import("bcrypt");
        const passwordHash = await bcrypt.hash(input.password, 10);

        // Para operadores (profissionais): se não tiver comissão, definir 50% e marcar como inapto
        let comissaoPercentual = input.comissaoPercentual;
        let aptoParaAtender = input.aptoParaAtender;

        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error("Database not available");

        await dbInstance.insert(users).values({
          openId,
          name: input.name,
          email: input.email,
          passwordHash,
          loginMethod: "manual",
          role: input.role,
          tenantId: input.tenantId ?? null,
          comissaoPercentual: comissaoPercentual ? comissaoPercentual.toString() : null,
          aptoParaAtender: aptoParaAtender !== undefined ? aptoParaAtender : true,
        });

        const newUser = await db.getUserByOpenId(openId);
        if (!newUser) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar usuário" });
        }

        return newUser;
    }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          role: z.enum(["admin", "operator", "user"]).optional(),
          tenantId: z.number().optional(),
          comissaoPercentual: z.number().min(0).max(100).optional(),
          aptoParaAtender: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const user = await db.getUserById(id);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
        }

        const role = data.role ?? user.role;
        let comissaoPercentual = data.comissaoPercentual;
        let aptoParaAtender = data.aptoParaAtender;

        await db.upsertUser({
          openId: user.openId,
          name: data.name ?? user.name,
          email: data.email ?? user.email,
          role: role,
          tenantId: data.tenantId ?? user.tenantId,
          comissaoPercentual: comissaoPercentual !== undefined ? comissaoPercentual.toString() : user.comissaoPercentual,
          aptoParaAtender: aptoParaAtender !== undefined ? aptoParaAtender : user.aptoParaAtender,
        });
        return await db.getUserById(id);
      }),

    resetPassword: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          password: z.string().min(6),
        })
      )
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
        }

        const bcrypt = await import("bcrypt");
        const passwordHash = await bcrypt.hash(input.password, 10);

        await db.updateUserPassword(input.userId, passwordHash);
        return { success: true };
      }),
  }),

  // ============= TÉCNICOS ROUTES =============
  tecnicos: router({
    list: adminProcedure.query(async () => {
      return await db.getAllTecnicos();
    }),

    listByTipo: tenantProcedure
      .input(z.object({ tipo: z.enum(["inspetor", "responsavel"]) }))
      .query(async ({ input, ctx }) => {
        // Se for admin, retorna todos; se for operador, filtra por tenant
        if (ctx.user.role === "admin") {
          return await db.getTecnicosByTipo(input.tipo);
        }
        const tecnicos = await db.getTecnicosByTipo(input.tipo);
        return tecnicos.filter((t) => t.tenantId === ctx.user.tenantId);
      }),

    listByTenant: tenantProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verificar se o usuário tem acesso a este tenant
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado a este estabelecimento" });
        }
        return await db.getTecnicosByTenant(input.tenantId);
      }),

    getById: tenantProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const tecnico = await db.getTecnicoById(input.id);
        if (!tecnico) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Técnico não encontrado" });
        }
        // Verificar se o usuário tem acesso a este técnico
        if (ctx.user.role !== "admin" && tecnico.tenantId !== ctx.user.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado a este técnico" });
        }
        return tecnico;
      }),

    create: tenantProcedure
      .input(
        z.object({
          tipo: z.enum(["inspetor", "responsavel"]),
          nomeCompleto: z.string().min(1),
          cpf: z.string().min(11).max(14),
          cft: z.string().optional(),
          crea: z.string().optional(),
          tenantId: z.number().optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Validar campos obrigatórios baseado no tipo
        if (input.tipo === "inspetor" && !input.cft) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "CFT é obrigatório para Inspetor Técnico" });
        }
        if (input.tipo === "responsavel" && !input.crea) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "CREA é obrigatório para Responsável Técnico" });
        }

        // Se for operador, usar o tenantId do usuário
        const finalTenantId = ctx.user.role === "admin" ? input.tenantId : ctx.user.tenantId;

        // Limpar campos que não pertencem ao tipo
        const data: any = {
          tipo: input.tipo,
          nomeCompleto: input.nomeCompleto,
          cpf: input.cpf,
          tenantId: finalTenantId,
          ativo: input.ativo ?? true,
        };

        if (input.tipo === "inspetor") {
          data.cft = input.cft;
          data.crea = null;
        } else {
          data.crea = input.crea;
          data.cft = null;
        }

        return await db.createTecnico(data);
      }),

    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          tipo: z.enum(["inspetor", "responsavel"]).optional(),
          nomeCompleto: z.string().min(1).optional(),
          cpf: z.string().min(11).max(14).optional(),
          cft: z.string().optional(),
          crea: z.string().optional(),
          tenantId: z.number().optional().nullable(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;

        // Verificar se o técnico existe e se o usuário tem acesso
        const tecnico = await db.getTecnicoById(id);
        if (!tecnico) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Técnico não encontrado" });
        }
        if (ctx.user.role !== "admin" && tecnico.tenantId !== ctx.user.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado a este técnico" });
        }

        // Se for operador, garantir que o tenantId não seja alterado
        if (ctx.user.role !== "admin" && data.tenantId !== undefined) {
          data.tenantId = ctx.user.tenantId;
        }

        // Se o tipo está sendo atualizado, validar campos obrigatórios
        if (data.tipo) {
          if (data.tipo === "inspetor" && data.cft === null) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "CFT é obrigatório para Inspetor Técnico" });
          }
          if (data.tipo === "responsavel" && data.crea === null) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "CREA é obrigatório para Responsável Técnico" });
          }
        } else {
          // Validar campos baseado no tipo atual
          if (tecnico.tipo === "inspetor" && data.cft === null && tecnico.cft === null) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "CFT é obrigatório para Inspetor Técnico" });
          }
          if (tecnico.tipo === "responsavel" && data.crea === null && tecnico.crea === null) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "CREA é obrigatório para Responsável Técnico" });
          }
        }

        return await db.updateTecnico(id, data);
      }),

    delete: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verificar se o técnico existe e se o usuário tem acesso
        const tecnico = await db.getTecnicoById(input.id);
        if (!tecnico) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Técnico não encontrado" });
        }
        if (ctx.user.role !== "admin" && tecnico.tenantId !== ctx.user.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado a este técnico" });
        }
        await db.deleteTecnico(input.id);
        return { success: true };
      }),
  }),

  // ============= COMPANY ROUTES =============
  companies: router({
    listByTenant: tenantProcedure
      .input(z.object({ tenantId: z.number(), includeInactive: z.boolean().optional() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getCompaniesByTenant(input.tenantId, input.includeInactive);
      }),

    getById: tenantProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const company = await db.getCompanyById(input.id);
        if (!company || company.tenantId !== ctx.user.tenantId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada ou não pertence ao seu estabelecimento." });
        }
        return company;
      }),

    create: tenantProcedure
      .input(
        z.object({
          tenantId: z.number(),
          nome: z.string(),
          cnpj: z.string().optional(),
          razaoSocial: z.string().optional(),
          email: z.string().email().optional(),
          telefone: z.string().optional(),
          endereco: z.string().optional(),
          cidade: z.string().optional(),
          estado: z.string().optional(),
          cep: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.createCompany(input);
      }),

    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          cnpj: z.string().optional(),
          razaoSocial: z.string().optional(),
          email: z.string().email().optional(),
          telefone: z.string().optional(),
          endereco: z.string().optional(),
          cidade: z.string().optional(),
          estado: z.string().optional(),
          cep: z.string().optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateCompany(id, data);
      }),
  }),

  // ============= INVOICE ROUTES =============
  invoices: router({
    listByTenant: tenantProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const invoices = await db.getInvoicesByTenant(input.tenantId);
        
        // Buscar informações da empresa para cada fatura
        const invoicesWithCompany = await Promise.all(
          invoices.map(async (invoice) => {
            let company = null;
            if (invoice.companyId) {
              company = await db.getCompanyById(invoice.companyId);
            }
            return {
              ...invoice,
              company,
            };
          })
        );
        
        return invoicesWithCompany;
      }),

    listPendingByTenant: tenantProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getPendingInvoicesByTenant(input.tenantId);
      }),

    create: tenantProcedure
      .input(
        z.object({
          tenantId: z.number(),
          companyId: z.number(),
          valorTotal: z.number().int().nonnegative(),
          appointmentIds: z.array(z.number()), // IDs das inspeções para vincular
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Criar fatura
        const invoice = await db.createInvoice({
          tenantId: input.tenantId,
          companyId: input.companyId,
          valorTotal: input.valorTotal,
          status: "pendente",
        });

        // Vincular inspeções à fatura
        for (const appointmentId of input.appointmentIds) {
          try {
            const appointment = await db.getAppointmentById(appointmentId);
            if (!appointment) {
              console.error(`[INVOICE] Appointment ${appointmentId} não encontrado para vincular à fatura ${invoice.id}`);
              continue;
            }
            
            // Buscar preço da inspeção
            let valor = 0;
            if (appointment.inspectionTypeId) {
              const inspectionTypePrice = await db.getInspectionTypePrice(input.tenantId, appointment.inspectionTypeId);
              valor = inspectionTypePrice?.preco || 0;
            }
            
            // Se não encontrou preço pelo tipo, usar o valor total dividido pelo número de inspeções
            if (valor === 0 && input.appointmentIds.length > 0) {
              valor = Math.floor(input.valorTotal / input.appointmentIds.length);
            }
            
            // Vincular mesmo sem inspectionTypeId (pode ser que ainda não tenha sido definido)
            await db.linkAppointmentToInvoice(invoice.id, appointmentId, valor);
            console.log(`[INVOICE] Appointment ${appointmentId} vinculado à fatura ${invoice.id} com valor ${valor}`);
          } catch (error: any) {
            console.error(`[INVOICE] Erro ao vincular appointment ${appointmentId} à fatura ${invoice.id}:`, error.message);
            // Continuar com os outros appointments mesmo se um falhar
          }
        }

        return invoice;
      }),

    close: tenantProcedure
      .input(
        z.object({
          invoiceId: z.number(),
          formaPagamento: z.enum(["pix", "boleto"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const invoice = await db.getInvoiceById(input.invoiceId);
        if (!invoice) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Fatura não encontrada" });
        }
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== invoice.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.closeInvoice(input.invoiceId, input.formaPagamento);
      }),

    getAppointments: tenantProcedure
      .input(z.object({ invoiceId: z.number() }))
      .query(async ({ input, ctx }) => {
        const invoice = await db.getInvoiceById(input.invoiceId);
        if (!invoice) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Fatura não encontrada" });
        }
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== invoice.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const invoiceAppointments = await db.getInvoiceAppointments(input.invoiceId);
        const appointments = await Promise.all(
          invoiceAppointments.map(async (ia) => {
            const appointment = await db.getAppointmentById(ia.appointmentId);
            return {
              ...ia,
              appointment,
            };
          })
        );
        
        return appointments;
      }),

    getById: tenantProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const invoice = await db.getInvoiceById(input.id);
      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Fatura não encontrada" });
      }
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== invoice.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return invoice;
    }),

    // Endpoint temporário para corrigir boletoUrl de faturas que foram geradas mas não salvaram o URL
    fixBoletoUrl: tenantProcedure
      .input(z.object({ invoiceId: z.number(), boletoUrl: z.string().optional(), iuguInvoiceId: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const invoice = await db.getInvoiceById(input.invoiceId);
        if (!invoice) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Fatura não encontrada" });
        }
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== invoice.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        let boletoUrl = input.boletoUrl;
        
        // Se não forneceu boletoUrl mas forneceu iuguInvoiceId, consultar na Iugu
        if (!boletoUrl && input.iuguInvoiceId) {
          const { consultarFatura } = await import("./integrations/iugu");
          try {
            const tenant = await db.getTenantById(ctx.user.tenantId || invoice.tenantId);
            let subaccountToken: string | undefined = undefined;
            
            if (tenant?.iuguSubaccountToken) {
              subaccountToken = tenant.iuguSubaccountToken;
            } else if (tenant?.iuguAccountId) {
              const { obterTokenSubconta } = await import("./integrations/iugu");
              subaccountToken = await obterTokenSubconta(tenant.iuguAccountId);
            }
            
            const iuguInvoice = await consultarFatura(input.iuguInvoiceId, subaccountToken);
            boletoUrl = iuguInvoice.secure_url || null;
            
            if (!boletoUrl) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível encontrar o boletoUrl na fatura da Iugu" });
            }
          } catch (error: any) {
            throw new TRPCError({ 
              code: "INTERNAL_SERVER_ERROR", 
              message: `Erro ao consultar fatura na Iugu: ${error.message}` 
            });
          }
        }
        
        if (!boletoUrl) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "boletoUrl ou iuguInvoiceId é obrigatório" });
        }
        
        await db.updateInvoice(input.invoiceId, {
          boletoUrl: boletoUrl,
          formaPagamento: "boleto",
        });
        
        return await db.getInvoiceById(input.invoiceId);
      }),

    listByCompany: tenantProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verificar se a empresa pertence ao tenant
        const company = await db.getCompanyById(input.companyId);
        if (!company) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
        }
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== company.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const invoices = await db.getInvoicesByCompany(input.companyId);
        
        // Buscar inspeções vinculadas a cada fatura
        const invoicesWithAppointments = await Promise.all(
          invoices.map(async (invoice) => {
            const invoiceAppointments = await db.getInvoiceAppointments(invoice.id);
            const appointments = await Promise.all(
              invoiceAppointments.map(async (ia) => {
                const appointment = await db.getAppointmentById(ia.appointmentId);
                return {
                  ...appointment,
                  valorVinculado: ia.valor,
                };
              })
            );
            return {
              ...invoice,
              appointments: appointments.filter(Boolean),
            };
          })
        );
        
        return invoicesWithAppointments;
      }),

    getUninvoicedByCompany: tenantProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getUninvoicedAppointmentsByCompany(input.tenantId);
      }),

    generateBoleto: tenantProcedure
      .input(
        z.object({
          companyId: z.number(),
          appointmentIds: z.array(z.number()),
          dueDate: z.coerce.date().optional(), // Data de vencimento (opcional, padrão 7 dias)
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Verificar se a empresa pertence ao tenant
        const company = await db.getCompanyById(input.companyId);
        if (!company) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
        }
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== company.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Buscar inspeções
        const appointments = await Promise.all(
          input.appointmentIds.map((id) => db.getAppointmentById(id))
        );

        // Verificar se todas as inspeções existem e pertencem à empresa
        for (const appointment of appointments) {
          if (!appointment) {
            throw new TRPCError({ code: "NOT_FOUND", message: `Inspeção não encontrada` });
          }
          if (appointment.companyId !== input.companyId) {
            throw new TRPCError({ code: "BAD_REQUEST", message: `Inspeção não pertence à empresa selecionada` });
          }
          // Removido: verificação de status "realizado" - permite faturar qualquer inspeção vinculada à empresa
        }

        // Filtrar apenas inspeções válidas
        const validAppointments = appointments.filter((ap): ap is NonNullable<typeof ap> => ap !== undefined);
        
        if (validAppointments.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma inspeção válida encontrada" });
        }

        // Calcular valor total
        let valorTotal = 0;
        const items: Array<{ description: string; quantity: number; price_cents: number }> = [];

        if (!ctx.user.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Usuário não associado a um estabelecimento" });
        }

        for (const appointment of validAppointments) {
          let preco = 0;
          if (appointment.inspectionTypeId !== null && appointment.inspectionTypeId !== undefined) {
            const pricing = await db.getInspectionTypePrice(ctx.user.tenantId, appointment.inspectionTypeId);
            preco = pricing?.preco || 0;
          }

          if (preco > 0) {
            valorTotal += preco;
            const customer = appointment.customerId ? await db.getCustomerById(appointment.customerId) : null;
            const vehicle = appointment.vehicleId ? await db.getVehicleById(appointment.vehicleId) : null;
            
            items.push({
              description: `Inspeção #${appointment.id}${vehicle ? ` - ${vehicle.placa}` : ""}${customer ? ` - ${customer.nome}` : ""}`,
              quantity: 1,
              price_cents: preco,
            });
          }
        }

        if (valorTotal === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma inspeção com preço válido" });
        }

        // Criar fatura no banco
        const invoice = await db.createInvoice({
          tenantId: ctx.user.tenantId,
          companyId: input.companyId,
          valorTotal,
          status: "pendente",
        });

        if (!invoice || !invoice.id) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar fatura" });
        }

        // Garantir que invoice.id é um número
        const invoiceId = Number(invoice.id);
        if (isNaN(invoiceId) || invoiceId <= 0) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `ID da fatura inválido: ${invoice.id}` });
        }

        console.log(`[BOLETO] Fatura criada com ID: ${invoiceId} (tipo: ${typeof invoice.id})`);

        // Vincular inspeções à fatura
        for (const appointment of validAppointments) {
          let preco = 0;
          if (appointment.inspectionTypeId !== null && appointment.inspectionTypeId !== undefined) {
            const pricing = await db.getInspectionTypePrice(ctx.user.tenantId, appointment.inspectionTypeId);
            preco = pricing?.preco || 0;
          }
          
          console.log(`[BOLETO] Vinculando appointment ${appointment.id} à fatura ${invoiceId} com valor ${preco}`);
          await db.linkAppointmentToInvoice(invoiceId, appointment.id, preco);
        }

        // Gerar boleto via Iugu
        const { criarFatura } = await import("./integrations/iugu");
        
        // Calcular data de vencimento (7 dias por padrão)
        const dueDate = input.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const dueDateStr = dueDate.toISOString().split("T")[0];

        // Buscar token da subconta (mesmo padrão usado no PIX)
        const tenant = await db.getTenantById(ctx.user.tenantId);
        let subaccountToken: string | undefined = undefined;
        
        if ((tenant as any).iuguSubaccountToken) {
          // Usar token direto se configurado
          subaccountToken = (tenant as any).iuguSubaccountToken;
          console.log(`[BOLETO] Usando token da subconta configurado diretamente`);
        } else if (tenant?.iuguAccountId) {
          // Fallback: buscar token via API (se necessário)
          try {
            const { obterTokenSubconta } = await import("./integrations/iugu");
            const token = await obterTokenSubconta(tenant.iuguAccountId);
            if (token) {
              subaccountToken = token;
              console.log("[BOLETO] Token da subconta obtido via API");
            } else {
              console.warn("[BOLETO] Não foi possível obter token da subconta, usando token principal");
            }
          } catch (error: any) {
            console.error("[BOLETO] Erro ao obter token da subconta:", error.message);
            console.warn("[BOLETO] Continuando com token principal");
          }
        }
        
        console.log(`[BOLETO] Criando boleto usando: ${subaccountToken ? "token da subconta" : "token principal"}`);

        // Buscar configuração de split global (mesma lógica do PIX)
        const splitConfig = await db.getSystemConfig("iugu_global_split_percent");
        const masterAccountIdConfig = await db.getSystemConfig("iugu_master_account_id");
        const splitPercent = splitConfig ? parseFloat(splitConfig.value) : 0;
        const masterAccountId = masterAccountIdConfig?.value || "";
        
        // Preparar splits se houver configuração
        const splits: any[] = [];
        if (splitPercent > 0 && masterAccountId && subaccountToken) {
          // Apenas aplicar split se estiver usando token da subconta
          // O split vai para a conta master
          splits.push({
            recipient_account_id: masterAccountId,
            percent: splitPercent,
          });
          console.log(`[BOLETO] Aplicando split global de ${splitPercent}% para conta master ${masterAccountId}`);
        }

        // Criar fatura na Iugu com boleto
        const iuguInvoice = await criarFatura(
          {
            email: company.email || undefined,
            due_date: dueDateStr,
            payable_with: "bank_slip", // Apenas boleto
            items,
            splits: splits.length > 0 ? splits : undefined, // Aplicar split global se configurado
            payer: {
              name: company.nome,
              cpf_cnpj: company.cnpj ? company.cnpj : undefined,
              email: company.email || undefined,
              phone: company.telefone || undefined,
              address: company.endereco
                ? {
                    street: company.endereco,
                    city: company.cidade || undefined,
                    state: company.estado || undefined,
                    zip_code: company.cep || undefined,
                  }
                : undefined,
            },
            notification_url: process.env.IUGU_WEBHOOK_URL || undefined,
          },
          subaccountToken
        );

        // Atualizar fatura com dados da Iugu
        console.log(`[BOLETO] Atualizando fatura ${invoiceId} com boleto URL: ${iuguInvoice.secure_url}`);
        console.log(`[BOLETO] Dados completos da resposta Iugu:`, JSON.stringify({
          id: iuguInvoice.id,
          secure_url: iuguInvoice.secure_url,
          status: iuguInvoice.status,
          method: iuguInvoice.method,
        }, null, 2));
        
        if (!iuguInvoice.secure_url) {
          console.error(`[BOLETO] ATENÇÃO: secure_url está vazio ou null na resposta da Iugu!`);
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: "Erro ao gerar boleto: URL do boleto não retornado pela Iugu" 
          });
        }
        
        await db.updateInvoice(invoiceId, {
          boletoUrl: iuguInvoice.secure_url,
          dataVencimento: new Date(dueDateStr),
          formaPagamento: "boleto",
        });

        // Retornar fatura atualizada e verificar se o boletoUrl foi salvo
        const updatedInvoice = await db.getInvoiceById(invoiceId);
        if (!updatedInvoice) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao buscar fatura atualizada" });
        }
        
        console.log(`[BOLETO] Fatura atualizada: boletoUrl=${updatedInvoice.boletoUrl ? 'SALVO' : 'NÃO SALVO'}`);
        if (!updatedInvoice.boletoUrl) {
          console.error(`[BOLETO] ERRO CRÍTICO: boletoUrl não foi salvo na fatura ${invoiceId}!`);
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: "Erro ao salvar URL do boleto na fatura" 
          });
        }
        
        return updatedInvoice;
      }),
  }),

  // ============= TENANT USER ROUTES =============
  tenantUsers: router({
    listByTenant: tenantProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        // Buscar todos os usuários do tenant
        const allUsers = await db.getAllUsers();
        return allUsers.filter((u) => u.tenantId === input.tenantId && u.role === "operator");
      }),

    create: tenantProcedure
      .input(
        z.object({
          tenantId: z.number(),
          name: z.string(),
          email: z.string().email(),
          password: z.string().min(6),
          groupId: z.number().optional(),
          comissaoPercentual: z.number().min(0).max(100).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Verificar se o grupo pertence ao tenant
        if (input.groupId) {
          const group = await db.getUserGroupById(input.groupId);
          if (!group || group.tenantId !== input.tenantId) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Grupo inválido" });
          }
        }

        const bcrypt = await import("bcrypt");
        const passwordHash = await bcrypt.hash(input.password, 10);

        const openId = `tenant-${input.tenantId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await db.upsertUser({
          openId,
          name: input.name,
          email: input.email,
          passwordHash,
          role: "operator",
          tenantId: input.tenantId,
          groupId: input.groupId,
          comissaoPercentual: input.comissaoPercentual !== undefined ? input.comissaoPercentual.toString() : null,
        });

        const user = await db.getUserByEmail(input.email);
        return user;
      }),

    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          password: z.string().min(6).optional(),
          groupId: z.number().optional().nullable(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(input.id);
        if (!user || user.tenantId !== ctx.user.tenantId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
        }

        if (ctx.user.role !== "admin" && ctx.user.tenantId !== user.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Verificar se o grupo pertence ao tenant
        if (input.groupId !== undefined && input.groupId !== null) {
          const group = await db.getUserGroupById(input.groupId);
          if (!group || group.tenantId !== ctx.user.tenantId) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Grupo inválido" });
          }
        }

        const updateData: any = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.email !== undefined) updateData.email = input.email;
        if (input.groupId !== undefined) updateData.groupId = input.groupId;
        if (input.password) {
          const bcrypt = await import("bcrypt");
          updateData.passwordHash = await bcrypt.hash(input.password, 10);
        }

        await db.upsertUser({
          openId: user.openId,
          ...updateData,
        });

        return await db.getUserById(input.id);
      }),

    delete: tenantProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const user = await db.getUserById(input.id);
      if (!user || user.tenantId !== ctx.user.tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
      }
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== user.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Não deletar, apenas desativar ou remover do tenant
      // Por enquanto, apenas retornar sucesso
      return { success: true };
    }),
  }),

  // ============= USER GROUP ROUTES =============
  userGroups: router({
    listByTenant: tenantProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getUserGroupsByTenant(input.tenantId);
      }),

    create: tenantProcedure
      .input(
        z.object({
          tenantId: z.number(),
          nome: z.string(),
          descricao: z.string().optional(),
          menuPaths: z.array(z.string()), // Array de paths dos menus permitidos
        })
      )
      .mutation(async ({ input, ctx }) => {
        console.log("[UserGroups] Criando grupo:", { tenantId: input.tenantId, nome: input.nome, menuPaths: input.menuPaths });
        console.log("[UserGroups] Context user:", { role: ctx.user.role, tenantId: ctx.user.tenantId });
        
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          console.log("[UserGroups] Erro: Acesso negado");
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        try {
          const group = await db.createUserGroup({
            tenantId: input.tenantId,
            nome: input.nome,
            descricao: input.descricao || undefined,
            ativo: true,
          });
          console.log("[UserGroups] Grupo criado com ID:", group.id);

          // Definir permissões de menu
          await db.setGroupMenuPermissions(group.id, input.menuPaths);
          console.log("[UserGroups] Permissões de menu definidas:", input.menuPaths);

          return { ...group, menuPaths: input.menuPaths };
        } catch (error: any) {
          console.error("[UserGroups] Erro ao criar grupo:", error);
          console.error("[UserGroups] Error message:", error?.message);
          console.error("[UserGroups] Error stack:", error?.stack);
          throw error;
        }
      }),

    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          descricao: z.string().optional(),
          menuPaths: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const group = await db.getUserGroupById(input.id);
        if (!group) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Grupo não encontrado" });
        }
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== group.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { id, menuPaths, ...data } = input;
        const updatedGroup = await db.updateUserGroup(id, data);

        // Atualizar permissões de menu se fornecidas
        if (menuPaths !== undefined) {
          await db.setGroupMenuPermissions(id, menuPaths);
        }

        const permissions = await db.getGroupMenuPermissions(id);
        return { ...updatedGroup, menuPaths: permissions.map((p) => p.menuPath) };
      }),

    getById: tenantProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const group = await db.getUserGroupById(input.id);
      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Grupo não encontrado" });
      }
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== group.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const permissions = await db.getGroupMenuPermissions(input.id);
      return { ...group, menuPaths: permissions.map((p) => p.menuPath) };
    }),

    delete: tenantProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const group = await db.getUserGroupById(input.id);
      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Grupo não encontrado" });
      }
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== group.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.deleteUserGroup(input.id);
      return { success: true };
    }),
  }),

  // ============= RECONCILIATION CONFIG ROUTES (ADMIN) =============
  reconciliationConfig: router({
    get: adminProcedure.query(async () => {
      return await db.getReconciliationConfig();
    }),

    upsert: adminProcedure
      .input(
        z.object({
          frequencia: z.enum(["diaria", "semanal", "mensal"]),
          diaSemana: z.number().optional(),
          diaMes: z.number().optional(),
          horario: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.upsertReconciliationConfig({
          frequencia: input.frequencia,
          diaSemana: input.diaSemana || null,
          diaMes: input.diaMes || null,
          horario: input.horario || null,
          ativo: true,
        });
      }),
  }),

  // ============= RECONCILIATION ROUTES =============
  reconciliations: router({
    listByTenant: tenantProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getReconciliationsByTenant(input.tenantId);
      }),

    getById: tenantProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const reconciliation = await db.getReconciliationById(input.id);
      if (!reconciliation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conciliação não encontrada" });
      }
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== reconciliation.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return reconciliation;
    }),

    create: tenantProcedure
      .input(
        z.object({
          tenantId: z.number(),
          dataReferencia: z.string(), // ISO date string
          inspecoesGoverno: z.array(
            z.object({
              placa: z.string(),
              renavam: z.string().optional(),
              dataInspecao: z.string(),
              tipoInspecao: z.string().optional(),
              numeroProtocolo: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const dataRef = new Date(input.dataReferencia);
        // Buscar inspeções da plataforma do dia (já vem com dados relacionados)
        const inspecoesPlataforma = await db.getAppointmentsByDate(input.tenantId, dataRef);

        // Criar mapa de inspeções do governo por placa
        const inspecoesGovernoMap = new Map(
          input.inspecoesGoverno.map((ig) => [
            ig.placa.toUpperCase().replace(/[^A-Z0-9]/g, ""),
            ig,
          ])
        );

        // Comparar e encontrar divergências
        const inspecoesConciliadas: any[] = [];
        const inspecoesDivergentes: any[] = [];
        const inspecoesForaSistema: any[] = [];

        // Verificar inspeções da plataforma
        for (const ap of inspecoesPlataforma) {
          const veiculo = (ap as any).vehicle;
          if (veiculo && veiculo.placa) {
            const placaNormalizada = veiculo.placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
            const inspecaoGoverno = inspecoesGovernoMap.get(placaNormalizada);

            if (inspecaoGoverno) {
              inspecoesConciliadas.push({
                appointmentId: ap.id,
                placa: veiculo.placa,
                plataforma: true,
                governo: true,
              });
              inspecoesGovernoMap.delete(placaNormalizada);
            } else {
              inspecoesDivergentes.push({
                appointmentId: ap.id,
                placa: veiculo.placa,
                plataforma: true,
                governo: false,
                motivo: "Inspeção na plataforma mas não encontrada no governo",
              });
            }
          } else if (ap.vehicleId) {
            // Veículo não encontrado mas tem ID
            inspecoesDivergentes.push({
              appointmentId: ap.id,
              placa: "N/A",
              plataforma: true,
              governo: false,
              motivo: "Veículo não encontrado na plataforma",
            });
          }
        }

        // Inspeções restantes no governo são "fora do sistema"
        for (const [, ig] of inspecoesGovernoMap) {
          inspecoesForaSistema.push({
            placa: ig.placa,
            dataInspecao: ig.dataInspecao,
            tipoInspecao: ig.tipoInspecao,
            numeroProtocolo: ig.numeroProtocolo,
            motivo: "Inspeção no governo mas não encontrada na plataforma",
          });
        }

        // Criar registro de conciliação
        const reconciliation = await db.createReconciliation({
          tenantId: input.tenantId,
          dataReferencia: dataRef,
          totalInspecoesPlataforma: inspecoesPlataforma.length,
          totalInspecoesGoverno: input.inspecoesGoverno.length,
          inspecoesConciliadas: inspecoesConciliadas.length,
          inspecoesDivergentes: inspecoesDivergentes.length,
          inspecoesForaSistema: inspecoesForaSistema.length,
          status: "concluida",
          detalhes: {
            conciliadas: inspecoesConciliadas,
            divergentes: inspecoesDivergentes,
            foraSistema: inspecoesForaSistema,
          },
        });

        return reconciliation;
      }),
  }),

  // ============= IUGU INTEGRATION ROUTES =============
  iugu: router({
    checkApiStatus: adminProcedure.query(async () => {
      const { ENV } = await import("./_core/env");
      const tokenConfigured = !!ENV.iuguApiToken && ENV.iuguApiToken.length > 0;
      const tokenPreview = tokenConfigured
        ? `${ENV.iuguApiToken.substring(0, 8)}...${ENV.iuguApiToken.substring(ENV.iuguApiToken.length - 4)}`
        : "";

      return {
        connected: tokenConfigured,
        tokenConfigured,
        tokenPreview,
        message: tokenConfigured
          ? "Token da API configurado corretamente"
          : "Token da API não configurado. Configure a variável IUGU_API_TOKEN no servidor.",
      };
    }),

    testConnection: adminProcedure.mutation(async () => {
      const { ENV } = await import("./_core/env");
      if (!ENV.iuguApiToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token da API não configurado. Configure a variável IUGU_API_TOKEN no servidor.",
        });
      }

      try {
        // Tentar fazer uma requisição simples para verificar a conexão
        const { consultarFatura } = await import("./integrations/iugu");
        // Não vamos realmente consultar uma fatura, mas verificar se o módulo carrega
        return {
          success: true,
          message: "Conexão com a API Iugu verificada com sucesso",
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao testar conexão: ${error.message}`,
        });
      }
    }),

    createSystemConfigTable: adminProcedure.mutation(async () => {
      try {
        const { getDb } = await import("./db");
        const { sql } = await import("drizzle-orm");
        const dbInstance = await getDb();
        if (!dbInstance) {
          throw new Error("Database not available");
        }

        // Criar tabela systemConfig se não existir
        await dbInstance.execute(sql`
          CREATE TABLE IF NOT EXISTS \`systemConfig\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`key\` varchar(100) NOT NULL UNIQUE,
            \`value\` text,
            \`description\` text,
            \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            UNIQUE KEY \`systemConfig_key_unique\` (\`key\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        return {
          success: true,
          message: "Tabela systemConfig criada com sucesso!",
        };
      } catch (error: any) {
        console.error("[IUGU] Erro ao criar tabela systemConfig:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Erro ao criar tabela systemConfig",
        });
      }
    }),

    getMasterAccountInfo: adminProcedure.query(async () => {
      try {
        const { ENV } = await import("./_core/env");
        const axios = (await import("axios")).default;
        const { getAuthHeaders } = await import("./integrations/iugu");
        const IUGU_API_URL = "https://api.iugu.com/v1";

        // Buscar informações da conta principal
        const response = await axios.get(`${IUGU_API_URL}/account`, {
          headers: getAuthHeaders(),
        });

        return {
          accountId: response.data.id || "",
          name: response.data.name || "",
          token: ENV.iuguApiToken ? `${ENV.iuguApiToken.substring(0, 8)}...${ENV.iuguApiToken.substring(ENV.iuguApiToken.length - 4)}` : "",
          fullToken: ENV.iuguApiToken || "",
        };
      } catch (error: any) {
        console.error("[IUGU] Erro ao buscar informações da conta master:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.response?.data?.errors || error.message || "Erro ao buscar informações da conta master",
        });
      }
    }),

    getGlobalSplitConfig: adminProcedure.query(async () => {
      try {
        const splitPercent = await db.getSystemConfig("iugu_global_split_percent");
        const masterAccountId = await db.getSystemConfig("iugu_master_account_id");
        
        return {
          splitPercent: splitPercent && splitPercent.value ? parseFloat(splitPercent.value) : 12, // Default 12%
          masterAccountId: masterAccountId?.value || "",
        };
      } catch (error: any) {
        console.error("[IUGU] Erro ao buscar configuração de split global:", error);
        // Retornar valores padrão em caso de erro
        return {
          splitPercent: 12,
          masterAccountId: "",
        };
      }
    }),

    updateGlobalSplitConfig: adminProcedure
      .input(
        z.object({
          splitPercent: z.number().min(0).max(100),
          masterAccountId: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        await db.setSystemConfig(
          "iugu_global_split_percent",
          input.splitPercent.toString(),
          "Percentual de split global para conta master (0-100)"
        );
        await db.setSystemConfig(
          "iugu_master_account_id",
          input.masterAccountId,
          "Account ID da conta master na IUGU"
        );
        
        return {
          success: true,
          message: "Configuração de split global atualizada com sucesso!",
        };
      }),

    listCreditCardTransactions: adminProcedure
      .input(
        z.object({
          created_at_from: z.string().optional(),
          account_id: z.string().optional(),
          invoice_id: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const { listarTransacoesCartao } = await import("./integrations/iugu");
          const transactions = await listarTransacoesCartao(undefined, input);
          
          return {
            success: true,
            transactions: transactions.items,
            totalItems: transactions.totalItems,
          };
        } catch (error: any) {
          console.error("[IUGU] Erro ao listar transações:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Erro ao listar transações: ${error.message}`,
          });
        }
      }),

    diagnoseCardPaymentIssues: adminProcedure
      .input(
        z.object({
          days: z.number().min(1).max(30).default(7), // Últimos 7 dias por padrão
          account_id: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const { listarTransacoesCartao } = await import("./integrations/iugu");
          
          // Calcular data de início
          const dateFrom = new Date();
          dateFrom.setDate(dateFrom.getDate() - input.days);
          const created_at_from = dateFrom.toISOString();
          
          const transactions = await listarTransacoesCartao(undefined, {
            created_at_from,
            account_id: input.account_id,
          });
          
          // Analisar transações
          const analysis = {
            total: transactions.totalItems,
            byStatus: {} as Record<string, number>,
            byLR: {} as Record<string, number>,
            byAccount: {} as Record<string, { total: number; denied: number; approved: number }>,
            recentDenied: [] as any[],
            recentApproved: [] as any[],
          };
          
          for (const tx of transactions.items) {
            // Contar por status
            analysis.byStatus[tx.status] = (analysis.byStatus[tx.status] || 0) + 1;
            
            // Contar por código LR
            if (tx.lr) {
              analysis.byLR[tx.lr] = (analysis.byLR[tx.lr] || 0) + 1;
            }
            
            // Contar por account_id
            if (!analysis.byAccount[tx.account_id]) {
              analysis.byAccount[tx.account_id] = { total: 0, denied: 0, approved: 0 };
            }
            analysis.byAccount[tx.account_id].total++;
            if (tx.status === "unauthorized" || tx.status === "failed") {
              analysis.byAccount[tx.account_id].denied++;
            } else if (tx.status === "authorized" || tx.status === "captured") {
              analysis.byAccount[tx.account_id].approved++;
            }
            
            // Coletar transações negadas recentes (últimas 10)
            if ((tx.status === "unauthorized" || tx.status === "failed") && analysis.recentDenied.length < 10) {
              analysis.recentDenied.push({
                id: tx.id,
                invoice_id: tx.invoice_id,
                account_id: tx.account_id,
                status: tx.status,
                lr: tx.lr,
                holder_name: tx.holder_name,
                last4: tx.last4,
                created_at: tx.created_at,
                email: tx.email,
              });
            }
            
            // Coletar transações aprovadas recentes (últimas 5)
            if ((tx.status === "authorized" || tx.status === "captured") && analysis.recentApproved.length < 5) {
              analysis.recentApproved.push({
                id: tx.id,
                invoice_id: tx.invoice_id,
                account_id: tx.account_id,
                status: tx.status,
                holder_name: tx.holder_name,
                last4: tx.last4,
                created_at: tx.created_at,
              });
            }
          }
          
          // Ordenar transações negadas por data (mais recentes primeiro)
          analysis.recentDenied.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          // Calcular taxa de negação
          const deniedCount = (analysis.byStatus["unauthorized"] || 0) + (analysis.byStatus["failed"] || 0);
          const deniedRate = analysis.total > 0 ? ((deniedCount / analysis.total) * 100).toFixed(2) : "0.00";
          
          // Gerar recomendações
          const recommendations: string[] = [];
          if (deniedRate === "100.00" && analysis.total > 0) {
            recommendations.push("⚠️ CRÍTICO: 100% das transações estão sendo negadas. Isso indica um problema de configuração na conta/subconta Iugu.");
            recommendations.push("Verifique no painel da Iugu se a subconta está habilitada para receber pagamentos com cartão de crédito.");
            recommendations.push("Verifique se o token da subconta está correto e ativo.");
          }
          
          if (analysis.byLR["AF02"] && analysis.byLR["AF02"] > 0) {
            const af02Rate = (analysis.byLR["AF02"] / analysis.total) * 100;
            if (af02Rate > 50) {
              recommendations.push(`⚠️ ${af02Rate.toFixed(1)}% das transações retornam código AF02 (Cartão não autorizado).`);
              recommendations.push("O código AF02 indica que o banco emissor não está autorizando as transações.");
              recommendations.push("Possíveis causas: subconta não habilitada para cartão, configuração de antifraude muito restritiva, ou problema na conta Iugu.");
              recommendations.push("Entre em contato com o suporte da Iugu fornecendo os IDs das transações negadas para investigação.");
            }
          }
          
          for (const [accountId, stats] of Object.entries(analysis.byAccount)) {
            const accountStats = stats as { total: number; denied: number; approved: number };
            if (accountStats.total > 0) {
              const accountDeniedRate = (accountStats.denied / accountStats.total) * 100;
              if (accountDeniedRate === 100) {
                recommendations.push(`⚠️ Subconta ${accountId.substring(0, 8)}... tem 100% de negação. Verifique a configuração desta subconta especificamente.`);
              }
            }
          }
          
          if (analysis.recentApproved.length === 0 && analysis.total > 0) {
            recommendations.push("⚠️ Nenhuma transação aprovada encontrada no período. Isso confirma um problema sistemático.");
          }
          
          if (analysis.recentApproved.length > 0 && parseFloat(deniedRate) > 50) {
            recommendations.push("ℹ️ Algumas transações são aprovadas, mas a taxa de negação é alta. Pode ser um problema de configuração de antifraude.");
          }
          
          if (recommendations.length === 0) {
            recommendations.push("✅ Não foram detectados problemas críticos nas transações analisadas.");
          }
          
          return {
            success: true,
            period: {
              from: created_at_from,
              days: input.days,
            },
            summary: {
              total: analysis.total,
              denied: deniedCount,
              approved: (analysis.byStatus["authorized"] || 0) + (analysis.byStatus["captured"] || 0),
              deniedRate: `${deniedRate}%`,
            },
            byStatus: analysis.byStatus,
            byLR: analysis.byLR,
            byAccount: analysis.byAccount,
            recentDenied: analysis.recentDenied,
            recentApproved: analysis.recentApproved,
            recommendations,
          };
        } catch (error: any) {
          console.error("[IUGU] Erro ao diagnosticar problemas:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Erro ao diagnosticar: ${error.message}`,
          });
        }
      }),

    testSubaccountConnection: adminProcedure
      .input(
        z.object({
          accountId: z.string(),
          token: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const axios = (await import("axios")).default;
          const { getAuthHeaders } = await import("./integrations/iugu");
          const IUGU_API_URL = "https://api.iugu.com/v1";

          // Testar conexão fazendo uma requisição simples com o token da subconta
          // Usar o endpoint de customers que é mais simples e confiável
          const response = await axios.get(`${IUGU_API_URL}/customers`, {
            headers: getAuthHeaders(input.token),
            params: {
              limit: 1, // Apenas 1 resultado para testar
            },
          });

          if (response.data !== undefined) {
            return {
              success: true,
              message: `Conexão com subconta ${input.accountId} testada com sucesso! Token válido.`,
            };
          }

          throw new Error("Resposta inválida da API");
        } catch (error: any) {
          console.error("[IUGU] Erro ao testar conexão da subconta:", {
            accountId: input.accountId,
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
          });

          const errorMessage = error.response?.data?.errors 
            ? (typeof error.response.data.errors === 'string' 
                ? error.response.data.errors 
                : JSON.stringify(error.response.data.errors))
            : error.response?.data?.message 
            ? error.response.data.message
            : error.message || "Erro ao testar conexão com a subconta";

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: errorMessage,
          });
        }
      }),

    createSubaccount: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          commission_percent: z.number().min(0).max(100).optional(),
          commission_cents: z.number().min(0).optional(),
          auto_withdraw: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { criarSubconta } = await import("./integrations/iugu");
        const result = await criarSubconta({
          name: input.name,
          commission_percent: input.commission_percent,
          commission_cents: input.commission_cents,
          auto_withdraw: input.auto_withdraw,
        });

        return {
          id: result.id,
          account_id: result.account_id,
          message: `Subconta criada com sucesso. Account ID: ${result.account_id}`,
        };
      }),

    listSubaccounts: adminProcedure.query(async () => {
      try {
        const { listarSubcontas } = await import("./integrations/iugu");
        const subcontas = await listarSubcontas();
        console.log(`[IUGU Router] Retornando ${subcontas.length} subcontas`);
        return subcontas;
      } catch (error: any) {
        console.error("[IUGU Router] Erro ao listar subcontas:", error);
        // Retornar array vazio em vez de lançar erro para não quebrar a interface
        return [];
      }
    }),
  }),

  // ============= ORGAO ROUTES =============
  orgaos: router({
    list: adminProcedure
      .input(z.object({ includeInactive: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllOrgaos(input?.includeInactive ?? false);
      }),

    // Endpoint para tenants listarem órgãos ativos (para gerar laudos)
    listActive: protectedProcedure
      .query(async () => {
        return await db.getAllOrgaos(false); // Apenas ativos
      }),

    getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const orgao = await db.getOrgaoById(input.id);
      if (!orgao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Órgão não encontrado" });
      }
      return orgao;
    }),

    create: adminProcedure
      .input(
        z.object({
          nome: z.string(),
          sigla: z.string().optional(),
          descricao: z.string().optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Limpar strings vazias para undefined
        const cleanInput: any = {
          nome: input.nome.trim(),
          ativo: input.ativo ?? true,
        };
        
        if (input.sigla && input.sigla.trim()) {
          cleanInput.sigla = input.sigla.trim();
        }
        
        if (input.descricao && input.descricao.trim()) {
          cleanInput.descricao = input.descricao.trim();
        }
        
        return await db.createOrgao(cleanInput);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          sigla: z.string().optional(),
          descricao: z.string().optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateOrgao(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteOrgao(input.id);
        return { success: true } as const;
      }),

    getUsers: adminProcedure.input(z.object({ orgaoId: z.number() })).query(async ({ input }) => {
      return await db.getOrgaoUsers(input.orgaoId);
    }),

    linkUser: adminProcedure
      .input(z.object({ userId: z.number(), orgaoId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.linkUserToOrgao(input.userId, input.orgaoId);
      }),

    unlinkUser: adminProcedure
      .input(z.object({ userId: z.number(), orgaoId: z.number() }))
      .mutation(async ({ input }) => {
        await db.unlinkUserFromOrgao(input.userId, input.orgaoId);
        return { success: true } as const;
      }),

    getMyOrgaos: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "orgao") {
        return [];
      }
      return await db.getUserOrgaos(ctx.user.id);
    }),
  }),

  // ============= INSPECTION REPORT ROUTES =============
  inspectionReports: router({
    getNextLaudoNumber: protectedProcedure
      .input(
        z.object({
          orgaoId: z.number(),
          tenantId: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const { generateLaudoNumber } = await import("./integrations/pdf-generator");
        return await generateLaudoNumber(input.orgaoId, input.tenantId);
      }),

    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const report = await db.getInspectionReportById(input.id);
      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Laudo não encontrado" });
      }

      // Verificar permissão: admin vê tudo, órgão vê apenas do seu órgão, operator vê apenas da sua ITL
      if (ctx.user.role === "orgao") {
        const userOrgaos = await db.getUserOrgaos(ctx.user.id);
        const userOrgaoIds = userOrgaos.map((uo) => uo.orgaoId);
        if (!userOrgaoIds.includes(report.orgaoId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para ver este laudo" });
        }
      } else if (ctx.user.role === "operator" && ctx.user.tenantId) {
        const appointment = await db.getAppointmentById(report.appointmentId);
        if (appointment?.tenantId !== ctx.user.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para ver este laudo" });
        }
      }

      // Buscar fotos do laudo
      const photos = await db.getInspectionReportPhotosByReport(report.id);

      return {
        ...report,
        photos,
      };
    }),

    getByAppointment: protectedProcedure
      .input(z.object({ appointmentId: z.number() }))
      .query(async ({ input, ctx }) => {
        const report = await db.getInspectionReportByAppointment(input.appointmentId);
        if (!report) return null;

        // Verificar permissão
        if (ctx.user.role === "orgao") {
          const userOrgaos = await db.getUserOrgaos(ctx.user.id);
          const userOrgaoIds = userOrgaos.map((uo) => uo.orgaoId);
          if (!userOrgaoIds.includes(report.orgaoId)) {
            return null; // Não retornar erro, apenas null
          }
        } else if (ctx.user.role === "operator" && ctx.user.tenantId) {
          const appointment = await db.getAppointmentById(input.appointmentId);
          if (appointment?.tenantId !== ctx.user.tenantId) {
            return null;
          }
        }

        const photos = await db.getInspectionReportPhotosByReport(report.id);
        return {
          ...report,
          photos,
        };
      }),

    listByOrgao: protectedProcedure
      .input(
        z.object({
          orgaoId: z.number().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        // Se for role "orgao", usar apenas o órgão do usuário
        let orgaoId = input.orgaoId;
        if (ctx.user.role === "orgao") {
          const userOrgaos = await db.getUserOrgaos(ctx.user.id);
          if (userOrgaos.length === 0) {
            return [];
          }
          // Se não especificou orgaoId, usar o primeiro órgão do usuário
          orgaoId = orgaoId || userOrgaos[0].orgaoId;
          // Verificar se o orgaoId solicitado pertence ao usuário
          const userOrgaoIds = userOrgaos.map((uo) => uo.orgaoId);
          if (!userOrgaoIds.includes(orgaoId!)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para ver laudos deste órgão" });
          }
        } else if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        if (!orgaoId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "orgaoId é obrigatório" });
        }

        const reports = await db.getInspectionReportsByOrgao(orgaoId);
        const limit = input.limit || 50;
        const offset = input.offset || 0;

        return reports.slice(offset, offset + limit);
      }),

    create: protectedProcedure
      .input(
        z.object({
          appointmentId: z.number(),
          orgaoId: z.number(),
          numeroLaudo: z.string().optional(),
          responsavelTecnico: z.string().optional(),
          cft: z.string().optional(),
          crea: z.string().optional(),
          dataValidade: z.coerce.date().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Verificar se o appointment existe e tem status válido para gerar laudo
        const appointment = await db.getAppointmentById(input.appointmentId);
        if (!appointment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Inspeção não encontrada" });
        }

        // Permitir gerar laudo para inspeções pendentes, confirmadas ou realizadas
        if (appointment.status !== "pendente" && appointment.status !== "confirmado" && appointment.status !== "realizado") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas inspeções pendentes, confirmadas ou realizadas podem gerar laudo" });
        }

        // Verificar se já existe laudo para este appointment
        const existingReport = await db.getInspectionReportByAppointment(input.appointmentId);
        if (existingReport) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Já existe um laudo para esta inspeção" });
        }

        // Verificar se o tipo de inspeção tem órgão vinculado OU se foi fornecido orgaoId no input
        if (appointment.inspectionTypeId) {
          const inspectionType = await db.getInspectionTypeById(appointment.inspectionTypeId);
          // Se o tipo não tem órgão vinculado, o orgaoId deve ser fornecido explicitamente
          if (!inspectionType?.orgao && !input.orgaoId) {
            throw new TRPCError({ 
              code: "BAD_REQUEST", 
              message: "Este tipo de inspeção não possui órgão vinculado. É necessário selecionar um órgão ao gerar o laudo." 
            });
          }
          // Se o tipo tem órgão, verificar se o orgaoId fornecido corresponde
          if (inspectionType?.orgao && input.orgaoId) {
            const orgao = await db.getOrgaoById(input.orgaoId);
            if (!orgao || (orgao.nome !== inspectionType.orgao && orgao.sigla !== inspectionType.orgao)) {
              console.warn(`[Laudo] Órgão fornecido (${orgao?.nome}) não corresponde ao órgão do tipo de inspeção (${inspectionType.orgao})`);
              // Não lançar erro, permitir que o usuário selecione outro órgão se necessário
            }
          }
        }

        // Verificar permissão: operator só pode criar laudo para sua ITL
        if (ctx.user.role === "operator" && ctx.user.tenantId !== appointment.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para criar laudo para esta inspeção" });
        }

        // Gerar número do certificado automaticamente
        const { generateCertificadoNumber } = await import("./integrations/pdf-generator");
        const numeroCertificado = await generateCertificadoNumber(input.orgaoId);

        const report = await db.createInspectionReport({
          appointmentId: input.appointmentId,
          orgaoId: input.orgaoId,
          numeroCertificado,
          numeroLaudo: input.numeroLaudo,
          responsavelTecnico: input.responsavelTecnico,
          cft: input.cft,
          crea: input.crea,
          dataValidade: input.dataValidade ? new Date(input.dataValidade) : undefined,
          status: "rascunho",
        });

        return report;
      }),

    uploadPhotos: protectedProcedure
      .input(
        z.object({
          reportId: z.number(),
          photos: z.array(
            z.object({
              tipo: z.enum(["traseira", "dianteira"]),
              fileData: z.string(), // Base64
              fileName: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const report = await db.getInspectionReportById(input.reportId);
        if (!report) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Laudo não encontrado" });
        }

        // Verificar permissão
        if (ctx.user.role === "operator") {
          const appointment = await db.getAppointmentById(report.appointmentId);
          if (appointment?.tenantId !== ctx.user.tenantId) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }

        // Validar que tem as 2 fotos obrigatórias
        const tiposObrigatorios = ["traseira", "dianteira"];
        const tiposEnviados = input.photos.map((p) => p.tipo);
        const tiposFaltando = tiposObrigatorios.filter((t) => !tiposEnviados.includes(t));

        if (tiposFaltando.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Fotos obrigatórias faltando: ${tiposFaltando.join(", ")}`,
          });
        }

        // Salvar fotos no servidor
        const { saveReportPhoto } = await import("./_core/report-storage");
        const savedPhotos = [];
        for (const photo of input.photos) {
          const filePath = await saveReportPhoto(input.reportId, photo.tipo, photo.fileData, photo.fileName);
          const savedPhoto = await db.createInspectionReportPhoto({
            reportId: input.reportId,
            tipo: photo.tipo,
            filePath,
            fileName: photo.fileName,
          });
          savedPhotos.push(savedPhoto);
        }

        return savedPhotos;
      }),

    generatePdf: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const report = await db.getInspectionReportById(input.reportId);
        if (!report) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Laudo não encontrado" });
        }

        // Verificar permissão
        if (ctx.user.role === "operator") {
          const appointment = await db.getAppointmentById(report.appointmentId);
          if (appointment?.tenantId !== ctx.user.tenantId) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }

        // Verificar se tem as 2 fotos obrigatórias (traseira e dianteira)
        const photos = await db.getInspectionReportPhotosByReport(input.reportId);
        if (photos.length < 2) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "É necessário ter as 2 fotos obrigatórias (traseira e dianteira) para gerar o PDF" });
        }
        
        // Verificar se tem as fotos obrigatórias
        const tiposObrigatorios = ["traseira", "dianteira"];
        const tiposEnviados = photos.map((p) => p.tipo);
        const tiposFaltando = tiposObrigatorios.filter((t) => !tiposEnviados.includes(t));
        
        if (tiposFaltando.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Fotos obrigatórias faltando: ${tiposFaltando.join(", ")}` });
        }

        // Gerar PDF
        const { generateReportPdf } = await import("./integrations/pdf-generator");
        const pdfPath = await generateReportPdf(report, photos);

        // Atualizar laudo com caminho do PDF e status
        await db.updateInspectionReport(input.reportId, {
          pdfPath,
          status: "gerado",
        });

        return { pdfPath, success: true };
      }),

    downloadPdf: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ input, ctx }) => {
        const report = await db.getInspectionReportById(input.reportId);
        if (!report || !report.pdfPath) {
          throw new TRPCError({ code: "NOT_FOUND", message: "PDF do laudo não encontrado" });
        }

        // Verificar permissão
        if (ctx.user.role === "orgao") {
          const userOrgaos = await db.getUserOrgaos(ctx.user.id);
          const userOrgaoIds = userOrgaos.map((uo) => uo.orgaoId);
          if (!userOrgaoIds.includes(report.orgaoId)) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        } else if (ctx.user.role === "operator") {
          const appointment = await db.getAppointmentById(report.appointmentId);
          if (appointment?.tenantId !== ctx.user.tenantId) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }

        // Retornar URL ou path do PDF
        return { pdfPath: report.pdfPath };
      }),
  }),
});

export type AppRouter = typeof appRouter;
