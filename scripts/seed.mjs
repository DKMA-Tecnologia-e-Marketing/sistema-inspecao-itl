import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL não configurada!");
  process.exit(1);
}

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...");

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  try {
    // 1. Criar categorias de serviço
    console.log("📦 Criando categorias de serviço...");
    const categories = await db.insert(schema.serviceCategories).values([
      { nome: "Inspeção Veicular Básica", descricao: "Inspeções veiculares padrão" },
      { nome: "Inspeção Técnica Especializada", descricao: "Inspeções técnicas específicas" },
      { nome: "Vistoria para Modificações", descricao: "Vistorias para veículos modificados" },
    ]);
    console.log("✅ Categorias criadas");

    // 2. Criar serviços
    console.log("🔧 Criando serviços...");
    await db.insert(schema.services).values([
      { nome: "Inspeção Completa", descricao: "Inspeção veicular completa", categoryId: 1 },
      { nome: "Vistoria de Transferência", descricao: "Vistoria para transferência de propriedade", categoryId: 1 },
      { nome: "Inspeção GNV", descricao: "Inspeção de instalação de GNV", categoryId: 2 },
      { nome: "Vistoria de Reboque", descricao: "Vistoria para instalação de reboque", categoryId: 3 },
    ]);
    console.log("✅ Serviços criados");

    // 3. Criar escopos de vistoria
    console.log("📋 Criando escopos de vistoria...");
    await db.insert(schema.inspectionScopes).values([
      {
        nome: "Escopo Inmetro Básico",
        tipo: "inmetro",
        descricao: "Vistoria básica Inmetro",
        requerAutorizacaoDetran: false,
      },
      {
        nome: "Escopo Inmetro com Modificação",
        tipo: "inmetro",
        descricao: "Vistoria Inmetro para veículos modificados",
        requerAutorizacaoDetran: true,
      },
      {
        nome: "Escopo Prefeitura SP - Táxi",
        tipo: "prefeitura_sp",
        descricao: "Vistoria para táxi - Prefeitura de São Paulo",
        requerAutorizacaoDetran: false,
      },
      {
        nome: "Escopo Prefeitura Guarulhos - Táxi",
        tipo: "prefeitura_guarulhos",
        descricao: "Vistoria para táxi - Prefeitura de Guarulhos",
        requerAutorizacaoDetran: false,
      },
      {
        nome: "Escopo Mercosul",
        tipo: "mercosul",
        descricao: "Vistoria padrão Mercosul",
        requerAutorizacaoDetran: false,
      },
      {
        nome: "Inspeção Técnica - GNV",
        tipo: "tecnica",
        descricao: "Inspeção técnica para instalação de GNV",
        requerAutorizacaoDetran: true,
      },
    ]);
    console.log("✅ Escopos de vistoria criados");

    // 4. Criar estabelecimentos (tenants)
    console.log("🏢 Criando estabelecimentos...");
    await db.insert(schema.tenants).values([
      {
        nome: "ITL Centro - São Paulo",
        cnpj: "12.345.678/0001-90",
        telefone: "(11) 3456-7890",
        email: "centro@itlsp.com.br",
        endereco: "Av. Paulista, 1000",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01310-100",
        latitude: "-23.561684",
        longitude: "-46.655981",
        ativo: true,
      },
      {
        nome: "ITL Zona Norte - São Paulo",
        cnpj: "12.345.678/0002-71",
        telefone: "(11) 2345-6789",
        email: "zonanorte@itlsp.com.br",
        endereco: "Av. Tucuruvi, 500",
        cidade: "São Paulo",
        estado: "SP",
        cep: "02304-000",
        latitude: "-23.479489",
        longitude: "-46.602349",
        ativo: true,
      },
      {
        nome: "ITL Guarulhos",
        cnpj: "12.345.678/0003-52",
        telefone: "(11) 2468-1357",
        email: "guarulhos@itl.com.br",
        endereco: "Av. Monteiro Lobato, 200",
        cidade: "Guarulhos",
        estado: "SP",
        cep: "07040-000",
        latitude: "-23.462778",
        longitude: "-46.533611",
        ativo: true,
      },
    ]);
    console.log("✅ Estabelecimentos criados");

    // 5. Criar configurações de preço
    console.log("💰 Criando configurações de preço...");
    await db.insert(schema.priceConfigurations).values([
      { tenantId: 1, serviceId: 1, preco: 15000 }, // R$ 150,00
      { tenantId: 1, serviceId: 2, preco: 12000 }, // R$ 120,00
      { tenantId: 1, serviceId: 3, preco: 20000 }, // R$ 200,00
      { tenantId: 2, serviceId: 1, preco: 14500 }, // R$ 145,00
      { tenantId: 2, serviceId: 2, preco: 11500 }, // R$ 115,00
      { tenantId: 3, serviceId: 1, preco: 16000 }, // R$ 160,00
    ]);
    console.log("✅ Configurações de preço criadas");

    // 6. Criar configurações de split
    console.log("📊 Criando configurações de split...");
    await db.insert(schema.splitConfigurations).values([
      { tenantId: 1, serviceId: 1, percentualTenant: 8500, percentualPlataforma: 1500 }, // 85% tenant, 15% plataforma
      { tenantId: 1, serviceId: 2, percentualTenant: 8500, percentualPlataforma: 1500 },
      { tenantId: 2, serviceId: 1, percentualTenant: 8500, percentualPlataforma: 1500 },
      { tenantId: 3, serviceId: 1, percentualTenant: 8500, percentualPlataforma: 1500 },
    ]);
    console.log("✅ Configurações de split criadas");

    console.log("🎉 Seed concluído com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed()
  .then(() => {
    console.log("✨ Banco de dados populado!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha no seed:", error);
    process.exit(1);
  });
