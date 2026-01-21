import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL não configurada!");
  process.exit(1);
}

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...");

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // 1. Criar categorias de serviço
    console.log("📦 Criando categorias de serviço...");
    const [categoriesRows] = await connection.execute("SELECT COUNT(*) as total FROM serviceCategories");
    if ((categoriesRows[0]?.total ?? categoriesRows[0]?.TOTAL ?? 0) === 0) {
    await connection.execute(`
      INSERT INTO serviceCategories (nome, descricao, ativo) VALUES
      ('Inspeção Veicular Básica', 'Inspeções veiculares padrão', true),
      ('Inspeção Técnica Especializada', 'Inspeções técnicas específicas', true),
      ('Vistoria para Modificações', 'Vistorias para veículos modificados', true)
    `);
    console.log("✅ Categorias criadas");
    } else {
      console.log("ℹ️ Categorias já existentes - mantendo dados atuais");
    }

    // 2. Criar serviços
    console.log("🔧 Criando serviços...");
    const [servicesRows] = await connection.execute("SELECT COUNT(*) as total FROM services");
    if ((servicesRows[0]?.total ?? servicesRows[0]?.TOTAL ?? 0) === 0) {
    await connection.execute(`
      INSERT INTO services (nome, descricao, categoryId, ativo) VALUES
      ('Inspeção Completa', 'Inspeção veicular completa', 1, true),
      ('Vistoria de Transferência', 'Vistoria para transferência de propriedade', 1, true),
      ('Inspeção GNV', 'Inspeção de instalação de GNV', 2, true),
      ('Vistoria de Reboque', 'Vistoria para instalação de reboque', 3, true)
    `);
    console.log("✅ Serviços criados");
    } else {
      console.log("ℹ️ Serviços já existentes - mantendo dados atuais");
    }

    // 3. Criar escopos de vistoria
    console.log("📋 Criando escopos de vistoria...");
    const [scopeRows] = await connection.execute("SELECT COUNT(*) as total FROM inspectionScopes");
    if ((scopeRows[0]?.total ?? scopeRows[0]?.TOTAL ?? 0) === 0) {
    await connection.execute(`
      INSERT INTO inspectionScopes (nome, tipo, descricao, requerAutorizacaoDetran, ativo) VALUES
      ('Escopo Inmetro Básico', 'inmetro', 'Vistoria básica Inmetro', false, true),
      ('Escopo Inmetro com Modificação', 'inmetro', 'Vistoria Inmetro para veículos modificados', true, true),
      ('Escopo Prefeitura SP - Táxi', 'prefeitura_sp', 'Vistoria para táxi - Prefeitura de São Paulo', false, true),
      ('Escopo Prefeitura Guarulhos - Táxi', 'prefeitura_guarulhos', 'Vistoria para táxi - Prefeitura de Guarulhos', false, true),
      ('Escopo Mercosul', 'mercosul', 'Vistoria padrão Mercosul', false, true),
      ('Inspeção Técnica - GNV', 'tecnica', 'Inspeção técnica para instalação de GNV', true, true)
    `);
    console.log("✅ Escopos de vistoria criados");
    } else {
      console.log("ℹ️ Escopos de vistoria já existentes - mantendo dados atuais");
    }

    // 4. Criar estabelecimentos (tenants)
    console.log("🏢 Criando estabelecimentos...");
    const [tenantRows] = await connection.execute("SELECT COUNT(*) as total FROM tenants");
    if ((tenantRows[0]?.total ?? tenantRows[0]?.TOTAL ?? 0) === 0) {
    await connection.execute(`
      INSERT INTO tenants (nome, cnpj, telefone, email, endereco, cidade, estado, cep, latitude, longitude, ativo) VALUES
      ('ITL Centro - São Paulo', '12.345.678/0001-90', '(11) 3456-7890', 'centro@itlsp.com.br', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100', '-23.561684', '-46.655981', true),
      ('ITL Zona Norte - São Paulo', '12.345.678/0002-71', '(11) 2345-6789', 'zonanorte@itlsp.com.br', 'Av. Tucuruvi, 500', 'São Paulo', 'SP', '02304-000', '-23.479489', '-46.602349', true),
      ('ITL Guarulhos', '12.345.678/0003-52', '(11) 2468-1357', 'guarulhos@itl.com.br', 'Av. Monteiro Lobato, 200', 'Guarulhos', 'SP', '07040-000', '-23.462778', '-46.533611', true)
    `);
    console.log("✅ Estabelecimentos criados");
    } else {
      console.log("ℹ️ Estabelecimentos já existentes - mantendo dados atuais");
    }

    // 5. Criar configurações de preço
    console.log("💰 Criando configurações de preço...");
    const [priceRows] = await connection.execute("SELECT COUNT(*) as total FROM priceConfigurations");
    if ((priceRows[0]?.total ?? priceRows[0]?.TOTAL ?? 0) === 0) {
    await connection.execute(`
      INSERT INTO priceConfigurations (tenantId, serviceId, preco, ativo) VALUES
      (1, 1, 15000, true),
      (1, 2, 12000, true),
      (1, 3, 20000, true),
      (2, 1, 14500, true),
      (2, 2, 11500, true),
      (3, 1, 16000, true)
    `);
    console.log("✅ Configurações de preço criadas");
    } else {
      console.log("ℹ️ Configurações de preço já existentes - mantendo dados atuais");
    }

    // 6. Criar configurações de split
    console.log("📊 Criando configurações de split...");
    const [splitRows] = await connection.execute("SELECT COUNT(*) as total FROM splitConfigurations");
    if ((splitRows[0]?.total ?? splitRows[0]?.TOTAL ?? 0) === 0) {
    await connection.execute(`
      INSERT INTO splitConfigurations (tenantId, serviceId, percentualTenant, percentualPlataforma, ativo) VALUES
      (1, 1, 8500, 1500, true),
      (1, 2, 8500, 1500, true),
      (2, 1, 8500, 1500, true),
      (3, 1, 8500, 1500, true)
    `);
    console.log("✅ Configurações de split criadas");
    } else {
      console.log("ℹ️ Configurações de split já existentes - mantendo dados atuais");
    }

    // 7. Criar tipos de inspeção (se ainda não existirem)
    console.log("🛠 Criando tipos de inspeção...");
    const [inspectionTypeRows] = await connection.execute("SELECT COUNT(*) as total FROM inspectionTypes");
    const inspectionTypeTotal = inspectionTypeRows[0]?.total ?? inspectionTypeRows[0]?.TOTAL ?? 0;
    if (inspectionTypeTotal === 0) {
      await connection.execute(`
        INSERT INTO inspectionTypes (nome, categoria, descricao, precoBase, variacaoMaxima, ativo) VALUES
        ('GNV - Inclusão', 'Segurança Veicular', 'Inspeção de inclusão de kit GNV', 58000, 800, true),
        ('GNV - Periódica', 'Segurança Veicular', 'Inspeção periódica para veículos GNV', 45000, 500, true),
        ('Sinistro ou Modificado', 'Segurança Veicular', 'Inspeção para veículos sinistrados ou modificados', 60000, 800, true),
        ('Caminhões - Pesado', 'Segurança Veicular', 'Inspeção de segurança para veículos pesados', 75000, 1000, true)
      `);
      console.log("✅ Tipos de inspeção criados");
    } else {
      console.log("ℹ️ Tipos de inspeção já existentes - mantendo dados atuais");
    }

    // 8. Criar linhas de inspeção (se ainda não existirem)
    console.log("🛤️ Criando linhas de inspeção base...");
    const [inspectionLineRows] = await connection.execute("SELECT COUNT(*) as total FROM inspectionLines");
    const inspectionLineTotal = inspectionLineRows[0]?.total ?? inspectionLineRows[0]?.TOTAL ?? 0;
    if (inspectionLineTotal === 0) {
      await connection.execute(`
        INSERT INTO inspectionLines (tenantId, nome, tipo, descricao, quantidade, ativo) VALUES
        (1, 'Linha Leve 01', 'leve', 'Linha dedicada a veículos leves', 2, true),
        (1, 'Linha Pesado 01', 'pesado', 'Linha especializada em caminhões e ônibus', 1, true),
        (2, 'Linha Mista 01', 'mista', 'Linha flexível para leves e pesados', 1, true),
        (3, 'Linha Motocicletas 01', 'motocicleta', 'Linha exclusiva para motos', 1, true)
      `);
      console.log("✅ Linhas de inspeção criadas");
    } else {
      console.log("ℹ️ Linhas de inspeção já existentes - mantendo dados atuais");
    }

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
