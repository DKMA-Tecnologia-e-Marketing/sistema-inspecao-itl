#!/usr/bin/env node
// Script que substitui crypto e corrige jsxDEV em produção
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist', 'public', 'assets');

console.log('[Fix Crypto & JSX] Processando...');

const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(distDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // 1. Substituir crypto - ULTRA AGRESSIVO - MÉTODO DEFINITIVO
  // Primeiro, encontrar e preservar o polyfill
  const polyfillEnd1 = content.indexOf('})();');
  const polyfillEnd2 = content.indexOf('}}();');
  const polyfillEnd = polyfillEnd1 > 0 ? polyfillEnd1 : (polyfillEnd2 > 0 ? polyfillEnd2 : -1);
  
  if (polyfillEnd > 0 && polyfillEnd < 2000) {
    // Preservar polyfill
    const polyfill = content.substring(0, polyfillEnd + 5);
    const rest = content.substring(polyfillEnd + 5);
    
    // MÉTODO DEFINITIVO: Substituir TODAS as ocorrências de crypto
    // Usar múltiplas passadas para garantir que nada escape
    
    let restFixed = rest;
    let iterations = 0;
    let changed = true;
    
    // Loop até não haver mais mudanças (garantir que tudo foi substituído)
    while (changed && iterations < 10) {
      const before = restFixed;
      
      // Passada 1: crypto. -> globalThis.crypto.
      restFixed = restFixed.replace(/crypto\./g, 'globalThis.crypto.');
      
      // Passada 2: typeof crypto -> typeof globalThis.crypto
      restFixed = restFixed.replace(/typeof\s+crypto/g, 'typeof globalThis.crypto');
      
      // Passada 3: crypto standalone - SUBSTITUIR TODOS (exceto os que já estão em globalThis)
      // Usar regex mais simples que funciona mesmo em código minificado
      restFixed = restFixed.replace(/\bcrypto\b/g, (match, offset, string) => {
        // Verificar contexto antes e depois
        const beforeContext = string.substring(Math.max(0, offset - 20), offset);
        const afterContext = string.substring(offset + match.length, Math.min(string.length, offset + match.length + 20));
        
        // Se já está em globalThis, window, self, ou é parte de uma propriedade, não substituir
        if (beforeContext.endsWith('globalThis.') || 
            beforeContext.endsWith('window.') || 
            beforeContext.endsWith('self.') ||
            beforeContext.endsWith('.') ||
            afterContext.startsWith('.')) {
          return match; // Manter como está
        }
        
        // Substituir por globalThis.crypto
        return 'globalThis.crypto';
      });
      
      // Passada 4: Casos especiais em objetos
      restFixed = restFixed.replace(/\[["']crypto["']\]/g, '["globalThis.crypto"]');
      
      // Passada 5: Atribuições
      restFixed = restFixed.replace(/\b(var|let|const)\s+crypto\s*=/g, '$1 crypto = globalThis.crypto');
      
      // Passada 6: Verificações
      restFixed = restFixed.replace(/if\s*\(\s*crypto\s*\)/g, 'if (globalThis.crypto)');
      restFixed = restFixed.replace(/if\s*\(\s*!\s*crypto\s*\)/g, 'if (!globalThis.crypto)');
      
      changed = (before !== restFixed);
      iterations++;
    }
    
    content = polyfill + restFixed;
    
    // Log de substituições
    const cryptoCount = (content.match(/\bcrypto\b/g) || []).length;
    const globalThisCount = (content.match(/globalThis\.crypto/g) || []).length;
    console.log(`[Fix] ${file}: crypto=${cryptoCount}, globalThis.crypto=${globalThisCount}, iterações=${iterations}`);
  } else {
    // Sem polyfill encontrado, substituir tudo de forma agressiva
    content = content.replace(/crypto\./g, 'globalThis.crypto.');
    content = content.replace(/typeof\s+crypto/g, 'typeof globalThis.crypto');
    // Substituir TODAS as ocorrências de crypto standalone
    content = content.replace(/\bcrypto\b/g, (match, offset, string) => {
      const beforeContext = string.substring(Math.max(0, offset - 20), offset);
      if (beforeContext.endsWith('globalThis.') || beforeContext.endsWith('window.') || beforeContext.endsWith('self.') || beforeContext.endsWith('.')) {
        return match;
      }
      return 'globalThis.crypto';
    });
  }
  
  // Corrigir duplicatas e casos especiais
  content = content.replace(/globalThis\.globalThis\.crypto/g, 'globalThis.crypto');
  content = content.replace(/globalThis\.crypto\.crypto/g, 'globalThis.crypto');
  
  // 2. CRÍTICO: Substituir jsxDEV por jsx (produção)
  // React 19 em produção não deve usar jsxDEV
  // PROBLEMA: s.jsxDEV deve ser substituído por jsx (não s.jsx) porque jsx é importado diretamente
  const beforeJsxdev = (content.match(/s\.jsxDEV\(/g) || []).length;
  const beforeJsxdevDot = (content.match(/\.jsxDEV\(/g) || []).length;
  
  // CORREÇÃO: s.jsxDEV deve virar jsx (não s.jsx) porque jsx é uma função standalone
  // Primeiro substituir s.jsxDEV por jsx
  content = content.replace(/s\.jsxDEV\(/g, 'jsx(');
  // Depois substituir outras variações
  content = content.replace(/\.jsxDEV\(/g, '.jsx(');
  content = content.replace(/\bjsxDEV\(/g, 'jsx(');
  
  // CRÍTICO: Corrigir react-jsx-dev-runtime que define jsx como undefined
  // O problema está em Ac.jsx=void 0 dentro da função GT()
  // Substituir Ac.jsx=void 0 por Ac.jsx=l (onde l é a função jsx definida anteriormente)
  // Substituir TODAS as ocorrências diretamente
  content = content.replace(/Ac\.jsx\s*=\s*void\s+0/g, 'Ac.jsx=l');
  content = content.replace(/Ac\["jsx"\]\s*=\s*void\s+0/g, 'Ac["jsx"]=l');
  content = content.replace(/Ac\['jsx'\]\s*=\s*void\s+0/g, "Ac['jsx']=l");
  content = content.replace(/\.jsx\s*=\s*void\s+0/g, '.jsx=l');
  content = content.replace(/\bjsx\s*=\s*void\s+0/g, 'jsx=l');
  // Também substituir undefined
  content = content.replace(/Ac\.jsx\s*=\s*undefined/g, 'Ac.jsx=l');
  content = content.replace(/\.jsx\s*=\s*undefined/g, '.jsx=l');
  content = content.replace(/\bjsx\s*=\s*undefined/g, 'jsx=l');
  
  // Verificar se ainda há ocorrências e tentar padrões alternativos
  const remainingJsxdev = (content.match(/jsxDEV/g) || []).length;
  if (remainingJsxdev > 0) {
    // Tentar padrões mais específicos
    content = content.replace(/['"]jsxDEV['"]/g, '"jsx"');
    content = content.replace(/jsxDEV\./g, 'jsx.');
    content = content.replace(/jsxDEV=/g, 'jsx=');
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    const cryptoCount = (content.match(/\bcrypto\b/g) || []).length;
    const globalThisCount = (content.match(/globalThis\.crypto/g) || []).length;
    const jsxdevCount = (content.match(/s\.jsxDEV\(/g) || []).length;
    const jsxCount = (content.match(/\.jsx\(/g) || []).length;
    console.log(`[Fix] ${file}: crypto=${cryptoCount}, globalThis.crypto=${globalThisCount}, jsxDEV=${beforeJsxdev}->${jsxdevCount}, jsx=${jsxCount}`);
  }
}

console.log('[Fix Crypto & JSX] ✅ Concluído!');
