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

async function resetAndCreateInspections() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log("🗑️  Iniciando exclusão de inspeções existentes...\n");
    
    // 1. Deletar dados relacionados primeiro (para evitar problemas de foreign key)
    console.log("   Deletando fotos de laudos...");
    await connection.execute("DELETE FROM inspectionReportPhotos");
    
    console.log("   Deletando laudos de inspeção...");
    await connection.execute("DELETE FROM inspectionReports");
    
    console.log("   Deletando vínculos de invoices...");
    await connection.execute("DELETE FROM invoiceAppointments");
    
    console.log("   Deletando pagamentos...");
    await connection.execute("DELETE FROM payments");
    
    console.log("   Deletando inspeções (appointments)...");
    const [deleteResult] = await connection.execute("DELETE FROM appointments");
    console.log(`   ✅ ${deleteResult.affectedRows} inspeção(ões) deletada(s)\n`);
    
    // 2. Buscar o tenant "ITL Teste" ou o primeiro tenant disponível
    const [tenants] = await connection.execute(
      "SELECT id, nome FROM tenants WHERE nome LIKE ? OR 1=1 ORDER BY CASE WHEN nome LIKE ? THEN 0 ELSE 1 END LIMIT 1",
      ["%ITL Teste%", "%ITL Teste%"]
    );
    
    if (tenants.length === 0) {
      throw new Error("Nenhum tenant encontrado");
    }
    
    const tenant = tenants[0];
    console.log(`✅ Tenant encontrado: ${tenant.nome} (ID: ${tenant.id})\n`);
    
    // 3. Buscar ou criar clientes e veículos
    const [existingCustomers] = await connection.execute(
      "SELECT id, nome FROM customers LIMIT 10"
    );
    
    let customers = [];
    if (existingCustomers.length >= 5) {
      // Usar clientes existentes
      customers = existingCustomers;
      console.log(`✅ Usando ${customers.length} clientes existentes`);
    } else {
      // Criar novos clientes
      console.log("📝 Criando novos clientes...");
      for (let i = 1; i <= 10; i++) {
        const [customerResult] = await connection.execute(
          `INSERT INTO customers (nome, cpf, email, telefone, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [
            `Cliente Teste ${i}`,
            `${String(10000000000 + i)}`,
            `cliente${i}@teste.com`,
            `1199999${String(1000 + i).padStart(4, '0')}`
          ]
        );
        customers.push({ id: customerResult.insertId, nome: `Cliente Teste ${i}` });
      }
      console.log(`✅ ${customers.length} clientes criados`);
    }
    
    // 4. Buscar ou criar veículos para cada cliente
    console.log("\n🚗 Preparando veículos...");
    const vehicles = [];
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const [existingVehicles] = await connection.execute(
        "SELECT id, placa FROM vehicles WHERE customerId = ? LIMIT 1",
        [customer.id]
      );
      
      if (existingVehicles.length > 0) {
        vehicles.push(existingVehicles[0]);
      } else {
        // Criar veículo
        const placa = `ABC${String(1000 + i).padStart(4, '0')}`;
        const [vehicleResult] = await connection.execute(
          `INSERT INTO vehicles (placa, renavam, customerId, createdAt, updatedAt)
           VALUES (?, ?, ?, NOW(), NOW())`,
          [placa, `${String(10000000000 + i)}`, customer.id]
        );
        vehicles.push({ id: vehicleResult.insertId, placa });
      }
    }
    console.log(`✅ ${vehicles.length} veículos preparados`);
    
    // 5. Buscar tipos de inspeção vinculados ao tenant
    const [inspectionTypes] = await connection.execute(
      `SELECT it.id, it.nome 
       FROM inspectionTypes it
       INNER JOIN inspectionTypeTenants itt ON it.id = itt.inspectionTypeId
       WHERE itt.tenantId = ? AND itt.ativo = 1 AND it.ativo = 1
       LIMIT 5`,
      [tenant.id]
    );
    
    if (inspectionTypes.length === 0) {
      throw new Error("Nenhum tipo de inspeção vinculado ao tenant");
    }
    
    console.log(`✅ ${inspectionTypes.length} tipo(s) de inspeção encontrado(s)`);
    
    // 6. Buscar scope de inspeção
    const [scopes] = await connection.execute(
      "SELECT id FROM inspectionScopes WHERE ativo = 1 LIMIT 1"
    );
    
    if (scopes.length === 0) {
      throw new Error("Nenhum scope de inspeção encontrado");
    }
    
    const scopeId = scopes[0].id;
    console.log(`✅ Scope encontrado: ID ${scopeId}\n`);
    
    // 7. Criar 20 inspeções
    console.log("📋 Criando 20 novas inspeções...\n");
    const statuses = ["pendente", "confirmado", "realizado", "cancelado"];
    const createdAppointments = [];
    
    for (let i = 0; i < 20; i++) {
      // Distribuir clientes e veículos de forma circular
      const customer = customers[i % customers.length];
      const vehicle = vehicles[i % vehicles.length];
      const inspectionType = inspectionTypes[i % inspectionTypes.length];
      
      // Criar data de agendamento variada (últimos 30 dias até próximos 30 dias)
      const daysOffset = Math.floor(Math.random() * 60) - 30;
      const dataAgendamento = new Date();
      dataAgendamento.setDate(dataAgendamento.getDate() + daysOffset);
      dataAgendamento.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
      
      // Status variado
      const status = statuses[i % statuses.length];
      
      const [appointmentResult] = await connection.execute(
        `INSERT INTO appointments (vehicleId, customerId, inspectionTypeId, inspectionScopeId, tenantId, dataAgendamento, status, observacoes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          vehicle.id,
          customer.id,
          inspectionType.id,
          scopeId,
          tenant.id,
          dataAgendamento,
          status,
          `Inspeção ${i + 1} criada automaticamente via script - ${new Date().toLocaleString('pt-BR')}`
        ]
      );
      
      createdAppointments.push({
        id: appointmentResult.insertId,
        customer: customer.nome,
        vehicle: vehicle.placa,
        type: inspectionType.nome,
        status,
        data: dataAgendamento.toLocaleString('pt-BR')
      });
      
      if ((i + 1) % 5 === 0) {
        console.log(`   ✅ ${i + 1}/20 inspeções criadas...`);
      }
    }
    
    console.log("\n✅ Processo concluído com sucesso!\n");
    console.log("📊 Resumo das inspeções criadas:\n");
    createdAppointments.forEach((apt, idx) => {
      console.log(`   ${idx + 1}. ID: ${apt.id} | ${apt.customer} | ${apt.vehicle} | ${apt.type} | ${apt.status}`);
    });
    
  } catch (error) {
    console.error("\n❌ Erro:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

resetAndCreateInspections();

