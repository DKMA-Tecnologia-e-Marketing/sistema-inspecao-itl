import 'dotenv/config';
import mysql from 'mysql2/promise';

async function createSystemConfigTable() {
  const dbConfig = {
    host: process.env.DATABASE_HOST || 'localhost',
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'inspecionasp',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
  };

  console.log("Conectando ao banco de dados...");
  console.log("Host:", dbConfig.host);
  console.log("Database:", dbConfig.database);

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("Conexão estabelecida.");

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \`systemConfig\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`key\` varchar(100) NOT NULL UNIQUE,
        \`value\` text,
        \`description\` text,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`systemConfig_key_unique\` (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableQuery);
    console.log("✓ Tabela systemConfig criada com sucesso!");

    // Verificar se a tabela foi criada
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'systemConfig'"
    );
    
    if (tables.length > 0) {
      console.log("✓ Tabela systemConfig verificada e existe no banco de dados.");
    } else {
      console.warn("⚠ Tabela systemConfig não foi encontrada após criação.");
    }

  } catch (error) {
    console.error("Erro:", error.message);
    throw new Error(`Erro fatal: ${error.message}`);
  } finally {
    if (connection) {
      await connection.end();
      console.log("Conexão encerrada.");
    }
  }
}

createSystemConfigTable().catch(err => {
  console.error(err.message);
  process.exit(1);
});
