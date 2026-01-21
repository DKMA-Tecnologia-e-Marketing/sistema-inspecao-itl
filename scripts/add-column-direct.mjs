// Script para adicionar coluna diretamente usando mysql2
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/inspecionasp";
const url = new URL(databaseUrl);

const config = {
  host: url.hostname,
  port: parseInt(url.port || "3306"),
  user: url.username,
  password: url.password,
  database: url.pathname.replace("/", ""),
};

async function addColumn() {
  let connection;
  try {
    console.log("Conectando ao banco de dados...");
    console.log("Host:", config.host);
    console.log("Database:", config.database);
    connection = await mysql.createConnection(config);

    console.log("Verificando se a coluna já existe...");
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'tenants' 
       AND COLUMN_NAME = 'iuguSubaccountToken'`,
      [config.database]
    );

    if (columns.length > 0) {
      console.log("✓ Coluna iuguSubaccountToken já existe!");
      return;
    }

    console.log("Adicionando coluna iuguSubaccountToken...");
    await connection.execute(
      `ALTER TABLE tenants 
       ADD COLUMN iuguSubaccountToken varchar(255) NULL AFTER iuguAccountId`
    );

    console.log("✓ Coluna iuguSubaccountToken adicionada com sucesso!");
  } catch (error) {
    console.error("Erro:", error.message);
    if (error.code === "ER_DUP_FIELDNAME" || error.errno === 1060) {
      console.log("Coluna já existe (detectado durante ALTER)");
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addColumn()
  .then(() => {
    console.log("Script concluído!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro fatal:", error);
    process.exit(1);
  });
