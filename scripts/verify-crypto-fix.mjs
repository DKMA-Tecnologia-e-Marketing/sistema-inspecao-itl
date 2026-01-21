#!/usr/bin/env node
// Script de verificação completa do fix de crypto
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist', 'public', 'assets');

console.log('=== VERIFICAÇÃO COMPLETA DO FIX DE CRYPTO ===\n');

const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));

let totalIssues = 0;

for (const file of files) {
  const filePath = path.join(distDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`Arquivo: ${file}`);
  
  // Verificar referências a crypto
  const cryptoMatches = content.match(/\bcrypto\b/g) || [];
  const globalThisMatches = content.match(/globalThis\.crypto/g) || [];
  
  // Verificar se há crypto fora do polyfill
  // O polyfill pode terminar com })(); ou }}();
  const polyfillEnd1 = content.indexOf('})();');
  const polyfillEnd2 = content.indexOf('}}();');
  const polyfillEnd = polyfillEnd1 > 0 ? polyfillEnd1 : (polyfillEnd2 > 0 ? polyfillEnd2 : -1);
  const hasPolyfill = polyfillEnd > 0 && polyfillEnd < 1000;
  
  let cryptoInCode = 0;
  if (hasPolyfill) {
    const codeAfterPolyfill = content.substring(polyfillEnd + 5);
    // Contar apenas crypto que não está dentro de strings ou comentários
    // Excluir crypto dentro do polyfill (que contém 'crypto' como string)
    cryptoInCode = (codeAfterPolyfill.match(/\bcrypto\b/g) || []).length;
    // Se o código após polyfill tem crypto, verificar se é dentro de strings
    // Por enquanto, assumir que se há crypto após polyfill, precisa ser substituído
  } else {
    // Sem polyfill, contar todas as referências
    cryptoInCode = cryptoMatches.length;
  }
  
  console.log(`  Referências a 'crypto': ${cryptoMatches.length}`);
  console.log(`  Referências a 'globalThis.crypto': ${globalThisMatches.length}`);
  console.log(`  Crypto no código (após polyfill): ${cryptoInCode}`);
  
  if (cryptoInCode > 0) {
    console.log(`  ⚠️  PROBLEMA: Há ${cryptoInCode} referências a crypto no código!`);
    totalIssues++;
  } else {
    console.log(`  ✅ OK: Todas as referências estão no polyfill ou foram substituídas`);
  }
  
  // Verificar se nanoid foi substituído
  const nanoidMatches = content.match(/\bnanoid\b/g) || [];
  if (nanoidMatches.length > 0) {
    console.log(`  ⚠️  ATENÇÃO: Há ${nanoidMatches.length} referências a 'nanoid'`);
  }
  
  // Verificar se jose foi removido
  const joseMatches = content.match(/\bjose\b/g) || [];
  if (joseMatches.length > 0) {
    console.log(`  ⚠️  ATENÇÃO: Há ${joseMatches.length} referências a 'jose'`);
  }
  
  console.log('');
}

if (totalIssues === 0) {
  console.log('✅ VERIFICAÇÃO PASSOU: Nenhum problema encontrado!');
  process.exit(0);
} else {
  console.log(`❌ VERIFICAÇÃO FALHOU: ${totalIssues} problema(s) encontrado(s)`);
  process.exit(1);
}

