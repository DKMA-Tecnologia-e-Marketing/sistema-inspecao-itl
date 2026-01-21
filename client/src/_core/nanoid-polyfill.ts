// Polyfill para nanoid que não usa crypto
// Usa Math.random() em vez de crypto.getRandomValues()
// Compatível com a API do nanoid

export function nanoid(size: number = 21): string {
  const alphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  let id = '';
  
  // Usar Math.random() em vez de crypto.getRandomValues()
  for (let i = 0; i < size; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  
  return id;
}

// Exportar como default também para compatibilidade
export default nanoid;

