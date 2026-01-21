#!/usr/bin/env node
import "dotenv/config";

const required = ["JWT_SECRET"];

console.log("Verificando variáveis de ambiente obrigatórias...");
let missing = [];

for (const key of required) {
  const value = process.env[key];
  if (!value || value.length === 0) {
    missing.push(key);
    console.error(`❌ ${key}: NÃO DEFINIDO OU VAZIO`);
  } else {
    console.log(`✅ ${key}: definido (${value.length} caracteres)`);
  }
}

if (missing.length > 0) {
  console.error(`\n❌ Faltam ${missing.length} variável(is) obrigatória(s): ${missing.join(", ")}`);
  process.exit(1);
}

console.log("\n✅ Todas as variáveis obrigatórias estão definidas!");
