#!/usr/bin/env node
import "dotenv/config";
import mysql from "mysql2/promise";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    email: { type: "string", short: "e" },
    nome: { type: "string", short: "n" },
    openId: { type: "string", short: "o" },
    password: { type: "string", short: "p" },
    tenantId: { type: "string", short: "t" },
    force: { type: "boolean", short: "f", default: false },
  },
});

async function main() {
  const { email, nome, openId, password, tenantId, force } = values;

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não configurado no ambiente.");
    process.exit(1);
  }

  if (!email) {
    console.error("Informe o e-mail do usuário operador com --email ou -e");
    process.exit(1);
  }

  if (!tenantId) {
    console.error("Informe o ID do tenant (ITL) com --tenantId ou -t");
    console.error("Use: pnpm run create-operator --email=operador@itl.com --tenantId=1 --nome='Nome do Operador'");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // Verificar se o tenant existe
    const [tenants] = await connection.execute("SELECT id, nome FROM tenants WHERE id = ? LIMIT 1", [tenantId]);
    if (tenants.length === 0) {
      console.error(`Tenant com ID ${tenantId} não encontrado.`);
      process.exit(1);
    }
    const tenant = tenants[0];
    console.log(`Criando operador para ITL: ${tenant.nome} (ID: ${tenant.id})`);

    const [existingByEmail] = await connection.execute("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    const resolvedOpenId = openId || (existingByEmail.length > 0 ? existingByEmail[0].openId : `manual-${email}`);

    if (existingByEmail.length > 0 && !force) {
      console.log(`Usuário com e-mail ${email} já existe. Use --force para atualizar o papel para operator.`);
      return;
    }

    // Hash da senha se fornecida
    let passwordHash = null;
    if (password) {
      const bcrypt = await import("bcrypt");
      passwordHash = await bcrypt.hash(password, 10);
    }

    const userPayload = {
      openId: resolvedOpenId,
      name: nome || existingByEmail[0]?.name || "Operador",
      email,
      passwordHash,
      loginMethod: "manual",
      role: "operator",
      tenantId: parseInt(tenantId, 10),
    };

    if (existingByEmail.length > 0) {
      if (passwordHash) {
        await connection.execute(
          "UPDATE users SET name = ?, role = 'operator', tenantId = ?, loginMethod = ?, passwordHash = ?, updatedAt = NOW() WHERE id = ?",
          [userPayload.name, userPayload.tenantId, userPayload.loginMethod, userPayload.passwordHash, existingByEmail[0].id]
        );
      } else {
        await connection.execute(
          "UPDATE users SET name = ?, role = 'operator', tenantId = ?, loginMethod = ?, updatedAt = NOW() WHERE id = ?",
          [userPayload.name, userPayload.tenantId, userPayload.loginMethod, existingByEmail[0].id]
        );
      }
      console.log(`Usuário ${email} atualizado para operador.`);
      return;
    }

    const [existingByOpenId] = await connection.execute("SELECT id FROM users WHERE openId = ? LIMIT 1", [resolvedOpenId]);
    if (existingByOpenId.length > 0) {
      console.error(`Já existe um usuário com openId ${resolvedOpenId}. Informe um openId diferente com --openId.`);
      process.exit(1);
    }

    await connection.execute(
      `INSERT INTO users (openId, name, email, passwordHash, loginMethod, role, tenantId, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, ?, ?, 'operator', ?, NOW(), NOW(), NOW())`,
      [userPayload.openId, userPayload.name, userPayload.email, userPayload.passwordHash, userPayload.loginMethod, userPayload.tenantId]
    );

    console.log(`
✅ Usuário operador criado com sucesso!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 E-mail: ${email}
👤 Nome: ${userPayload.name}
🏢 ITL: ${tenant.nome} (ID: ${tenant.id})
🔑 OpenID: ${userPayload.openId}
👥 Role: operator
${password ? "🔐 Senha: Configurada" : "⚠️  Senha: Não configurada (use --password para definir)"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Para fazer login, acesse: http://localhost:3003/login
`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Erro ao criar usuário operador:", error);
  process.exit(1);
});

