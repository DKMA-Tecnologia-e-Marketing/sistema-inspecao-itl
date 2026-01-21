#!/usr/bin/env node
import mysql from "mysql2/promise";
import { readFileSync } from "fs";

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
    
    // Listar todos os usuários
    const [users] = await connection.execute("SELECT id, email, name, role, passwordHash IS NOT NULL as has_password, createdAt FROM users ORDER BY createdAt DESC");
    
    console.log("\n📋 Usuários no banco de dados:\n");
    if (users.length === 0) {
      console.log("❌ Nenhum usuário encontrado!");
    } else {
      console.table(users);
      console.log(`\n✅ Total: ${users.length} usuário(s)`);
    }
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


