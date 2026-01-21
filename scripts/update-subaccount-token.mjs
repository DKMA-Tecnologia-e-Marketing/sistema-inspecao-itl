#!/usr/bin/env node

/**
 * Script para atualizar o token da subconta Iugu de um tenant
 * 
 * Uso:
 *   node scripts/update-subaccount-token.mjs <tenantId> <iuguSubaccountToken>
 * 
 * Exemplo:
 *   node scripts/update-subaccount-token.mjs 2 CE59DDB8D5C84D0D95C288DB8781D6BD
 */

import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, "..", ".env") });

const tenantId = process.argv[2];
const iuguSubaccountToken = process.argv[3];

if (!tenantId || !iuguSubaccountToken) {
  console.error("❌ Erro: tenantId e iuguSubaccountToken são obrigatórios");
  console.error("\nUso:");
  console.error("  node scripts/update-subaccount-token.mjs <tenantId> <iuguSubaccountToken>");
  console.error("\nExemplo:");
  console.error("  node scripts/update-subaccount-token.mjs 2 CE59DDB8D5C84D0D95C288DB8781D6BD");
  process.exit(1);
}

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

if (!dbConfig.user || !dbConfig.password || !dbConfig.database) {
  console.error("❌ Erro: Variáveis de ambiente do banco de dados não configuradas");
  console.error("Configure DB_HOST, DB_PORT, DB_USER, DB_PASSWORD e DB_NAME no arquivo .env");
  process.exit(1);
}

async function updateSubaccountToken() {
  let connection;
  
  try {
    console.log("🔌 Conectando ao banco de dados...");
    connection = await createConnection(dbConfig);
    
    // Verificar se o tenant existe
    const [tenants] = await connection.execute(
      "SELECT id, nome, iuguAccountId, iuguSubaccountToken FROM tenants WHERE id = ?",
      [tenantId]
    );
    
    if (tenants.length === 0) {
      console.error(`❌ Erro: Tenant com ID ${tenantId} não encontrado`);
      process.exit(1);
    }
    
    const tenant = tenants[0];
    console.log(`\n📋 Tenant encontrado:`);
    console.log(`   ID: ${tenant.id}`);
    console.log(`   Nome: ${tenant.nome || 'N/A'}`);
    console.log(`   iuguAccountId: ${tenant.iuguAccountId || 'N/A'}`);
    console.log(`   iuguSubaccountToken atual: ${tenant.iuguSubaccountToken ? tenant.iuguSubaccountToken.substring(0, 8) + '***' + tenant.iuguSubaccountToken.substring(tenant.iuguSubaccountToken.length - 4) : 'NÃO CONFIGURADO'}`);
    
    // Verificar se a coluna existe
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM tenants LIKE 'iuguSubaccountToken'"
    );
    
    if (columns.length === 0) {
      console.log("\n📝 Criando coluna iuguSubaccountToken...");
      await connection.execute(
        "ALTER TABLE tenants ADD COLUMN iuguSubaccountToken varchar(255) NULL AFTER iuguAccountId"
      );
      console.log("✅ Coluna criada com sucesso");
    }
    
    // Atualizar o token
    console.log(`\n🔄 Atualizando token da subconta...`);
    const tokenPreview = iuguSubaccountToken.substring(0, 8) + "***" + iuguSubaccountToken.substring(iuguSubaccountToken.length - 4);
    console.log(`   Novo token: ${tokenPreview}`);
    
    await connection.execute(
      "UPDATE tenants SET iuguSubaccountToken = ? WHERE id = ?",
      [iuguSubaccountToken, tenantId]
    );
    
    console.log("\n✅ Token da subconta atualizado com sucesso!");
    console.log(`\n📊 Resumo:`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Tenant Nome: ${tenant.nome || 'N/A'}`);
    console.log(`   Token: ${tokenPreview}`);
    console.log(`   Token completo (primeiros 12 e últimos 4): ${iuguSubaccountToken.substring(0, 12)}...${iuguSubaccountToken.substring(iuguSubaccountToken.length - 4)}`);
    
  } catch (error) {
    console.error("\n❌ Erro ao atualizar token da subconta:", error.message);
    if (error.code) {
      console.error(`   Código do erro: ${error.code}`);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("\n🔌 Conexão com banco de dados encerrada");
    }
  }
}

updateSubaccountToken();
