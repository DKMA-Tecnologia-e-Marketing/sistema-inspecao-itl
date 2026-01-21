import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
config({ path: join(__dirname, "..", ".env") });

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = parseInt(process.env.DB_PORT || "3306");
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "inspecionasp";

async function addColumn() {
  let connection;
  try {
    console.log("Conectando ao banco de dados...");
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });

    console.log("Verificando se a coluna iuguSubaccountToken já existe...");
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'tenants' 
       AND COLUMN_NAME = 'iuguSubaccountToken'`,
      [DB_NAME]
    );

    if (columns.length > 0) {
      console.log("✓ Coluna iuguSubaccountToken já existe. Nada a fazer.");
      return;
    }

    console.log("Adicionando coluna iuguSubaccountToken...");
    await connection.execute(
      `ALTER TABLE tenants 
       ADD COLUMN iuguSubaccountToken varchar(255) NULL AFTER iuguAccountId`
    );

    console.log("✓ Coluna iuguSubaccountToken adicionada com sucesso!");
  } catch (error) {
    console.error("Erro ao adicionar coluna:", error.message);
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("Coluna já existe. Nada a fazer.");
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
    console.log("Script concluído com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro fatal:", error);
    process.exit(1);
  });
