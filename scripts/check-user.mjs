#!/usr/bin/env node
import "dotenv/config";
import mysql from "mysql2/promise";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    email: { type: "string", short: "e" },
    password: { type: "string", short: "p" },
    role: { type: "string", short: "r" },
    tenantId: { type: "string", short: "t" },
    fix: { type: "boolean", short: "f", default: false },
  },
});

async function main() {
  const { email, password, role, tenantId, fix } = values;

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não configurado no ambiente.");
    process.exit(1);
  }

  if (!email) {
    console.error("Informe o e-mail do usuário com --email ou -e");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const [users] = await connection.execute("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    
    if (users.length === 0) {
      console.log(`❌ Usuário com e-mail ${email} não encontrado no banco de dados.`);
      if (fix && password && role) {
        console.log("Criando novo usuário...");
        const bcrypt = await import("bcrypt");
        const passwordHash = await bcrypt.hash(password, 10);
        const openId = `manual-${email}`;
        
        await connection.execute(
          `INSERT INTO users (openId, name, email, passwordHash, loginMethod, role, tenantId, createdAt, updatedAt, lastSignedIn)
           VALUES (?, ?, ?, ?, 'manual', ?, ?, NOW(), NOW(), NOW())`,
          [openId, email.split('@')[0], email, passwordHash, role, tenantId ? parseInt(tenantId, 10) : null]
        );
        console.log(`✅ Usuário criado com sucesso!`);
      }
      return;
    }

    const user = users[0];
    console.log(`\n📋 Informações do usuário ${email}:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`ID: ${user.id}`);
    console.log(`Nome: ${user.name || "Não definido"}`);
    console.log(`E-mail: ${user.email}`);
    console.log(`OpenID: ${user.openId}`);
    console.log(`Role: ${user.role || "Não definido"}`);
    console.log(`Tenant ID: ${user.tenantId || "Não associado"}`);
    console.log(`Login Method: ${user.loginMethod || "Não definido"}`);
    console.log(`Senha: ${user.passwordHash ? "✅ Configurada" : "❌ Não configurada"}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Verificar problemas
    const problems = [];
    if (!user.passwordHash) {
      problems.push("❌ Usuário não tem senha configurada");
    }
    if (!user.role) {
      problems.push("❌ Usuário não tem role definido");
    }
    if (user.role === "operator" && !user.tenantId) {
      problems.push("⚠️  Operador não está associado a uma ITL (tenantId)");
    }

    if (problems.length > 0) {
      console.log("⚠️  Problemas encontrados:");
      problems.forEach(p => console.log(`   ${p}`));
      console.log();
    } else {
      console.log("✅ Usuário está configurado corretamente!");
    }

    // Corrigir se solicitado
    if (fix) {
      console.log("\n🔧 Corrigindo usuário...");
      const updates = [];
      const values = [];

      if (password) {
        const bcrypt = await import("bcrypt");
        const passwordHash = await bcrypt.hash(password, 10);
        updates.push("passwordHash = ?");
        values.push(passwordHash);
        console.log("   ✅ Senha será atualizada");
      }

      if (role) {
        updates.push("role = ?");
        values.push(role);
        console.log(`   ✅ Role será atualizado para: ${role}`);
      }

      if (tenantId !== undefined) {
        updates.push("tenantId = ?");
        values.push(tenantId ? parseInt(tenantId, 10) : null);
        console.log(`   ✅ Tenant ID será atualizado para: ${tenantId || "null"}`);
      }

      if (updates.length > 0) {
        values.push(user.id);
        await connection.execute(
          `UPDATE users SET ${updates.join(", ")}, updatedAt = NOW() WHERE id = ?`,
          values
        );
        console.log("\n✅ Usuário atualizado com sucesso!");
      } else {
        console.log("\n⚠️  Nenhuma atualização foi especificada.");
      }
    } else if (problems.length > 0) {
      console.log("💡 Use --fix junto com --password, --role ou --tenantId para corrigir os problemas.");
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Erro:", error);
  process.exit(1);
});



