#!/usr/bin/env node
/**
 * Script para testar o acesso ao PDF
 */

import http from 'http';

const testUrl = 'http://localhost:5006/api/storage/reports/3/pdf/laudo-002-2026.pdf';

console.log('🧪 Testando acesso ao PDF...');
console.log('   URL:', testUrl);
console.log('');

const req = http.get(testUrl, (res) => {
  console.log('📊 Status Code:', res.statusCode);
  console.log('📋 Headers:');
  Object.entries(res.headers).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
  console.log('');
  
  if (res.statusCode === 200) {
    console.log('✅ PDF acessível!');
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('   Tamanho recebido:', data.length, 'bytes');
      if (data.startsWith('%PDF')) {
        console.log('   ✅ Arquivo é um PDF válido!');
      } else {
        console.log('   ⚠️  Arquivo não parece ser um PDF válido');
        console.log('   Primeiros bytes:', data.substring(0, 50));
      }
    });
  } else {
    console.log('❌ Erro ao acessar PDF');
    let errorData = '';
    res.on('data', (chunk) => {
      errorData += chunk;
    });
    res.on('end', () => {
      console.log('   Resposta:', errorData);
    });
  }
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error.message);
  console.log('');
  console.log('💡 Verifique se o servidor backend está rodando na porta 5006');
  console.log('   Execute: pnpm dev:backend');
});

req.setTimeout(5000, () => {
  console.error('❌ Timeout na requisição');
  req.destroy();
});

