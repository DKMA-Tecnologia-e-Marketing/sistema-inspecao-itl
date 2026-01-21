import mysql from 'mysql2/promise';

async function createSystemConfigTable() {
  // Usar as mesmas credenciais que o servidor usa
  // Se necessário, ajuste essas variáveis
  const dbConfig = {
    host: process.env.DATABASE_HOST || 'localhost',
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || 'Dk2025dkma',
    database: process.env.DATABASE_NAME || 'inspecionasp',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
  };

  console.log("Conectando ao banco de dados...");
  console.log("Host:", dbConfig.host);
  console.log("Database:", dbConfig.database);
  console.log("User:", dbConfig.user);

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✓ Conexão estabelecida.");

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

    // Verificar estrutura da tabela
    const [columns] = await connection.execute("DESCRIBE systemConfig");
    console.log("✓ Colunas da tabela:", columns.map((c: any) => c.Field).join(", "));

  } catch (error) {
    console.error("❌ Erro:", error.message);
    if (error.code) {
      console.error("Código do erro:", error.code);
    }
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log("Conexão encerrada.");
    }
  }
}

createSystemConfigTable().catch(err => {
  console.error("❌ Erro fatal:", err.message);
  process.exit(1);
});
