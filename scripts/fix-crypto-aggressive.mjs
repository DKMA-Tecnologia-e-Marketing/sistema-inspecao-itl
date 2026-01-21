#!/usr/bin/env node
// Script que substitui TODAS as referências a crypto por globalThis.crypto
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist', 'public', 'assets');

console.log('[Fix Crypto] Processando arquivos...');

const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(distDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Substituir crypto. por globalThis.crypto.
  content = content.replace(/crypto\./g, 'globalThis.crypto.');
  content = content.replace(/typeof\s+crypto/g, 'typeof globalThis.crypto');
  
  // Preservar polyfill (primeiros 500 chars)
  const polyfillEnd = content.indexOf('}}();') + 5;
  if (polyfillEnd > 0 && polyfillEnd < 1000) {
    const polyfill = content.substring(0, polyfillEnd);
    const rest = content.substring(polyfillEnd);
    const restFixed = rest.replace(/\bcrypto\b(?!\.)/g, 'globalThis.crypto');
    content = polyfill + restFixed;
  } else {
    content = content.replace(/\bcrypto\b(?!\.)/g, 'globalThis.crypto');
  }
  
  // Corrigir duplicatas
  content = content.replace(/globalThis\.globalThis\.crypto/g, 'globalThis.crypto');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Fix Crypto] ${file}: ✅ Substituído`);
  }
}

console.log('[Fix Crypto] ✅ Concluído!');
