import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Usar DATABASE_URL se disponível, senão construir a partir de variáveis individuais
let dbConfig;
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remove a barra inicial
    port: url.port ? parseInt(url.port) : 3306,
  };
} else {
  dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "itl_inspection",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  };
}

async function setupInspectionType() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // 1. Buscar o tenant "ITL Teste"
    const [tenants] = await connection.execute(
      "SELECT id, nome FROM tenants WHERE nome LIKE ?",
      ["%ITL Teste%"]
    );
    
    if (tenants.length === 0) {
      throw new Error("Tenant 'ITL Teste' não encontrado");
    }
    
    const tenant = tenants[0];
    console.log(`✅ Tenant encontrado: ${tenant.nome} (ID: ${tenant.id})`);
    
    // 2. Verificar se já existe um tipo de inspeção
    const [existingTypes] = await connection.execute(
      "SELECT id, nome FROM inspectionTypes WHERE nome = ?",
      ["Inspeção Veicular Regular"]
    );
    
    let inspectionTypeId;
    
    if (existingTypes.length > 0) {
      inspectionTypeId = existingTypes[0].id;
      console.log(`✅ Tipo de inspeção já existe: ${existingTypes[0].nome} (ID: ${inspectionTypeId})`);
    } else {
      // 3. Criar tipo de inspeção
      const [result] = await connection.execute(
        `INSERT INTO inspectionTypes (nome, categoria, precoBase, variacaoMaxima, ativo, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        ["Inspeção Veicular Regular", "Veicular", 15000, 5000, true]
      );
      
      inspectionTypeId = result.insertId;
      console.log(`✅ Tipo de inspeção criado: ID ${inspectionTypeId}`);
    }
    
    // 4. Vincular tipo de inspeção ao tenant
    const [existingLink] = await connection.execute(
      `SELECT id FROM inspectionTypeTenants 
       WHERE inspectionTypeId = ? AND tenantId = ?`,
      [inspectionTypeId, tenant.id]
    );
    
    if (existingLink.length === 0) {
      await connection.execute(
        `INSERT INTO inspectionTypeTenants (inspectionTypeId, tenantId, ativo, createdAt, updatedAt)
         VALUES (?, ?, ?, NOW(), NOW())`,
        [inspectionTypeId, tenant.id, true]
      );
      console.log(`✅ Tipo de inspeção vinculado ao tenant`);
    } else {
      // Atualizar para ativo se já existir
      await connection.execute(
        `UPDATE inspectionTypeTenants SET ativo = true, updatedAt = NOW()
         WHERE id = ?`,
        [existingLink[0].id]
      );
      console.log(`✅ Vínculo já existia, atualizado para ativo`);
    }
    
    // 5. Configurar preço (150,00 = 15000 centavos)
    const [existingPrice] = await connection.execute(
      `SELECT id FROM inspectionTypePrices 
       WHERE tenantId = ? AND inspectionTypeId = ?`,
      [tenant.id, inspectionTypeId]
    );
    
    if (existingPrice.length === 0) {
      await connection.execute(
        `INSERT INTO inspectionTypePrices (tenantId, inspectionTypeId, preco, ativo, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [tenant.id, inspectionTypeId, 15000, true]
      );
      console.log(`✅ Preço configurado: R$ 150,00`);
    } else {
      await connection.execute(
        `UPDATE inspectionTypePrices SET preco = ?, updatedAt = NOW()
         WHERE id = ?`,
        [15000, existingPrice[0].id]
      );
      console.log(`✅ Preço atualizado: R$ 150,00`);
    }
    
    console.log("\n✅ Configuração concluída com sucesso!");
    console.log(`   Tipo de Inspeção ID: ${inspectionTypeId}`);
    console.log(`   Tenant ID: ${tenant.id}`);
    
  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupInspectionType();

