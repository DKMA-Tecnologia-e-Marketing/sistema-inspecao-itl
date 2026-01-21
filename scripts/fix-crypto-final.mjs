#!/usr/bin/env node
// Script que substitui TODAS as referências a crypto por globalThis.crypto
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist', 'public', 'assets');

console.log('[Fix Crypto Final] Procurando arquivos...');

const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(distDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Contar ocorrências antes
  const beforeCount = (content.match(/\bcrypto\b/g) || []).length;
  
  // ESTRATÉGIA SIMPLES: Substituir crypto. por globalThis.crypto.
  content = content.replace(/crypto\./g, 'globalThis.crypto.');
  
  // Substituir typeof crypto por typeof globalThis.crypto
  content = content.replace(/typeof\s+crypto/g, 'typeof globalThis.crypto');
  
  // Substituir crypto standalone - preservar apenas no polyfill (primeiros 500 chars)
  // O polyfill está no início e contém getRandomValues
  const polyfillEnd = content.indexOf('}}();');
  const hasPolyfill = polyfillEnd > 0 && polyfillEnd < 1000;
  
  if (hasPolyfill) {
    // Dividir: polyfill (preservar) + resto (substituir)
    const polyfill = content.substring(0, polyfillEnd + 5);
    const rest = content.substring(polyfillEnd + 5);
    
    // Substituir crypto no resto
    const restFixed = rest.replace(/\bcrypto\b(?!\.)/g, 'globalThis.crypto');
    content = polyfill + restFixed;
  } else {
    // Sem polyfill identificado, substituir tudo
    content = content.replace(/\bcrypto\b(?!\.)/g, 'globalThis.crypto');
  }
  
  // Corrigir duplicatas globalThis.globalThis.crypto
  content = content.replace(/globalThis\.globalThis\.crypto/g, 'globalThis.crypto');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    const afterCount = (content.match(/\bcrypto\b/g) || []).length;
    const globalThisCount = (content.match(/globalThis\.crypto/g) || []).length;
    console.log(`[Fix Crypto Final] ${file}: ${beforeCount} -> ${afterCount} referências crypto, ${globalThisCount} com globalThis`);
  } else {
    console.log(`[Fix Crypto Final] ${file}: Nenhuma mudança`);
  }
}

console.log('[Fix Crypto Final] Concluído!');
