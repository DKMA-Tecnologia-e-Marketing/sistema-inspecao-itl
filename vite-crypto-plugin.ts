// Plugin que injeta polyfill crypto no início de cada chunk
import type { Plugin } from 'vite';

export function cryptoPolyfillPlugin(): Plugin {
  return {
    name: 'crypto-polyfill-inject',
    generateBundle(options, bundle) {
      // Apenas em produção - não injetar em desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        return;
      }
      
      for (const fileName in bundle) {
        const chunk = bundle[fileName];
        if (chunk.type === 'chunk' && chunk.code) {
          // Polyfill minificado que define crypto globalmente ANTES de qualquer código
          // CRÍTICO: Deve ser o PRIMEIRO código a executar
          // Usar variáveis únicas para não conflitar com código existente
          const polyfill = `(function(){'use strict';var _cp={getRandomValues:function(a){if(!a||0===a.length)return a;for(var i=0;i<a.length;i++)a[i]=Math.floor(256*Math.random());return a},randomUUID:function(){return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=16*Math.random()|0;return'x'===c?r:(3&r|8).toString(16)})},subtle:{}};function _sc(o,p){if(!o)return;try{o[p]=_cp}catch(e){try{Object.defineProperty(o,p,{value:_cp,writable:!0,configurable:!0,enumerable:!0})}catch(e2){}}}if('undefined'!=typeof globalThis)_sc(globalThis,'crypto');if('undefined'!=typeof window)_sc(window,'crypto');if('undefined'!=typeof self)_sc(self,'crypto');try{var g=function(){return this}();g&&_sc(g,'crypto')}catch(e){}})();`;
          chunk.code = polyfill + chunk.code;
        }
      }
    },
  };
}
