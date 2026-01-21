#!/usr/bin/env node
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import bcrypt from "bcrypt";

// Carregar .env.production
const envContent = readFileSync(".env.production", "utf8");
let databaseUrl = "";
envContent.split("\n").forEach(line => {
  if (line.startsWith("DATABASE_URL=")) {
    databaseUrl = line.split("=").slice(1).join("=").trim();
  }
});

if (!databaseUrl) {
  console.error("DATABASE_URL não encontrado no .env.production");
  process.exit(1);
}

async function main() {
  let connection;
  try {
    connection = await mysql.createConnection(databaseUrl);
    
    // Verificar se usuário existe
    const [existing] = await connection.execute("SELECT * FROM users WHERE email = ?", ["admin@inspecionasp.com.br"]);
    
    const passwordHash = await bcrypt.hash("Admin123!", 10);
    
    if (existing.length > 0) {
      console.log("Atualizando senha do usuário existente...");
      await connection.execute(
        "UPDATE users SET passwordHash = ?, role = ?, updatedAt = NOW() WHERE email = ?",
        [passwordHash, "admin", "admin@inspecionasp.com.br"]
      );
      console.log("✅ Senha atualizada!");
    } else {
      console.log("Criando novo usuário admin...");
      await connection.execute(
        `INSERT INTO users (openId, name, email, passwordHash, loginMethod, role, createdAt, updatedAt, lastSignedIn)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        ["manual-admin@inspecionasp.com.br", "Administrador", "admin@inspecionasp.com.br", passwordHash, "manual", "admin"]
      );
      console.log("✅ Usuário criado!");
    }
    
    console.log("\n📋 Credenciais:");
    console.log("E-mail: admin@inspecionasp.com.br");
    console.log("Senha: Admin123!");
  } catch (error) {
    console.error("Erro:", error.message);
    if (error.message.includes("Unknown database")) {
      console.error("\n⚠️  Banco de dados não existe. Verifique o DATABASE_URL.");
    } else if (error.message.includes("Table") && error.message.includes("doesn't exist")) {
      console.error("\n⚠️  Tabelas não existem. Execute as migrações primeiro.");
    }
  } finally {
    if (connection) await connection.end();
  }
}

main();


