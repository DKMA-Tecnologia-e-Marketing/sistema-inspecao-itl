// Plugin que substitui crypto por globalThis.crypto durante o build
import type { Plugin } from 'vite';

export function cryptoReplacePlugin(): Plugin {
  return {
    name: 'crypto-replace',
    transform(code, id) {
      // Apenas em produção - não substituir em desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        return null;
      }
      // Processar também node_modules que podem ter referências a crypto
      // Especialmente @trpc/client, superjson e outras dependências
      const shouldProcess = 
        id.includes('@trpc') || 
        id.includes('superjson') ||
        id.includes('jose') || 
        id.includes('nanoid') ||
        !id.includes('node_modules');
      
      if (!shouldProcess) {
        return null;
      }
      
      // Substituir crypto. por globalThis.crypto.
      if (code.includes('crypto.')) {
        code = code.replace(/crypto\./g, 'globalThis.crypto.');
      }
      
      // Substituir typeof crypto
      if (code.includes('typeof crypto')) {
        code = code.replace(/typeof\s+crypto/g, 'typeof globalThis.crypto');
      }
      
      // Substituir crypto standalone (mas não dentro de strings ou comentários)
      if (/\bcrypto\b/.test(code)) {
        code = code.replace(/\bcrypto\b(?!\.)/g, 'globalThis.crypto');
      }
      
      return {
        code,
        map: null,
      };
    },
    generateBundle(options, bundle) {
      // Apenas em produção
      if (process.env.NODE_ENV !== 'production') {
        return;
      }
      
      // Também substituir no bundle final
      for (const fileName in bundle) {
        const chunk = bundle[fileName];
        if (chunk.type === 'chunk' && chunk.code) {
          // Substituir crypto. por globalThis.crypto.
          chunk.code = chunk.code.replace(/crypto\./g, 'globalThis.crypto.');
          // Substituir typeof crypto
          chunk.code = chunk.code.replace(/typeof\s+crypto/g, 'typeof globalThis.crypto');
          // Substituir crypto standalone - MAS preservar no polyfill
          // O polyfill pode começar com (function(){ ou !function()
          const polyfillStart1 = chunk.code.indexOf('(function(){');
          const polyfillStart2 = chunk.code.indexOf('!function(){');
          const polyfillStart = polyfillStart1 >= 0 ? polyfillStart1 : (polyfillStart2 >= 0 ? polyfillStart2 : -1);
          const polyfillEnd = polyfillStart > -1 ? chunk.code.indexOf('})();', polyfillStart) + 5 : -1;
          
          if (polyfillStart > -1 && polyfillEnd > polyfillStart) {
            const before = chunk.code.substring(0, polyfillEnd);
            const after = chunk.code.substring(polyfillEnd);
            const afterFixed = after.replace(/\bcrypto\b(?!\.)/g, 'globalThis.crypto');
            chunk.code = before + afterFixed;
          } else {
            chunk.code = chunk.code.replace(/\bcrypto\b(?!\.)/g, 'globalThis.crypto');
          }
          
          // Corrigir duplicatas
          chunk.code = chunk.code.replace(/globalThis\.globalThis\.crypto/g, 'globalThis.crypto');
        }
      }
    },
  };
}

