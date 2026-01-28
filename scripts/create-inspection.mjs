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

async function createInspection() {
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
    
    // 2. Buscar ou criar um cliente (customers não tem tenantId, buscar qualquer um)
    const [customers] = await connection.execute(
      "SELECT id, nome FROM customers LIMIT 1"
    );
    
    let customerId;
    if (customers.length > 0) {
      customerId = customers[0].id;
      console.log(`✅ Cliente encontrado: ${customers[0].nome} (ID: ${customerId})`);
    } else {
      // Criar um cliente
      const [customerResult] = await connection.execute(
        `INSERT INTO customers (nome, cpf, email, telefone, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        ["Cliente Teste", "12345678901", "cliente@teste.com", "11999999999"]
      );
      customerId = customerResult.insertId;
      console.log(`✅ Cliente criado: ID ${customerId}`);
    }
    
    // 3. Buscar ou criar um veículo (vehicles não tem tenantId, buscar por customerId)
    const [vehicles] = await connection.execute(
      "SELECT id, placa FROM vehicles WHERE customerId = ? LIMIT 1",
      [customerId]
    );
    
    let vehicleId;
    if (vehicles.length > 0) {
      vehicleId = vehicles[0].id;
      console.log(`✅ Veículo encontrado: ${vehicles[0].placa} (ID: ${vehicleId})`);
    } else {
      // Criar um veículo
      const [vehicleResult] = await connection.execute(
        `INSERT INTO vehicles (placa, renavam, customerId, createdAt, updatedAt)
         VALUES (?, ?, ?, NOW(), NOW())`,
        ["TEST1234", "12345678901", customerId]
      );
      vehicleId = vehicleResult.insertId;
      console.log(`✅ Veículo criado: ID ${vehicleId}`);
    }
    
    // 4. Buscar tipo de inspeção vinculado ao tenant
    const [inspectionTypes] = await connection.execute(
      `SELECT it.id, it.nome 
       FROM inspectionTypes it
       INNER JOIN inspectionTypeTenants itt ON it.id = itt.inspectionTypeId
       WHERE itt.tenantId = ? AND itt.ativo = 1 AND it.ativo = 1
       LIMIT 1`,
      [tenant.id]
    );
    
    if (inspectionTypes.length === 0) {
      throw new Error("Nenhum tipo de inspeção vinculado ao tenant");
    }
    
    const inspectionType = inspectionTypes[0];
    console.log(`✅ Tipo de inspeção encontrado: ${inspectionType.nome} (ID: ${inspectionType.id})`);
    
    // 5. Buscar scope de inspeção
    const [scopes] = await connection.execute(
      "SELECT id FROM inspectionScopes WHERE ativo = 1 LIMIT 1"
    );
    
    if (scopes.length === 0) {
      throw new Error("Nenhum scope de inspeção encontrado");
    }
    
    const scopeId = scopes[0].id;
    console.log(`✅ Scope encontrado: ID ${scopeId}`);
    
    // 6. Buscar linha de inspeção
    const [lines] = await connection.execute(
      "SELECT id FROM inspectionLines WHERE tenantId = ? AND ativo = 1 LIMIT 1",
      [tenant.id]
    );
    
    let lineId = null;
    if (lines.length > 0) {
      lineId = lines[0].id;
      console.log(`✅ Linha de inspeção encontrada: ID ${lineId}`);
    } else {
      console.log(`⚠️  Nenhuma linha de inspeção encontrada, criando inspeção sem linha`);
    }
    
    // 7. Criar inspeção (appointments não tem inspectionLineId, apenas os campos do schema)
    const dataAgendamento = new Date();
    const [appointmentResult] = await connection.execute(
      `INSERT INTO appointments (vehicleId, customerId, inspectionTypeId, inspectionScopeId, tenantId, dataAgendamento, status, observacoes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [vehicleId, customerId, inspectionType.id, scopeId, tenant.id, dataAgendamento, "pendente", "Inspeção criada automaticamente via script"]
    );
    
    const appointmentId = appointmentResult.insertId;
    console.log(`✅ Inspeção criada com sucesso! ID: ${appointmentId}`);
    
    console.log("\n✅ Processo concluído com sucesso!");
    console.log(`   Inspeção ID: ${appointmentId}`);
    console.log(`   Veículo ID: ${vehicleId}`);
    console.log(`   Cliente ID: ${customerId}`);
    console.log(`   Tipo de Inspeção: ${inspectionType.nome}`);
    
  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createInspection();

