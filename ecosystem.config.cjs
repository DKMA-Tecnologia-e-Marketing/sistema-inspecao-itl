// PM2 config file - must be .cjs because package.json has "type": "module"
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente do .env.production se existir
function loadEnvFile(filePath) {
  const env = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  }
  return env;
}

// Usar diretório atual ou variável de ambiente
const appDir = process.env.APP_DIR || process.cwd() || '/var/www/inspecionasp';
const envFile = path.join(appDir, '.env.production');
const envVars = loadEnvFile(envFile);

console.log('📋 Diretório da aplicação:', appDir);
console.log('📋 Carregando variáveis de ambiente de:', envFile);
console.log('📋 Variáveis encontradas:', Object.keys(envVars).length);

module.exports = {
  apps: [
    {
      name: 'inspecionasp-backend',
      script: 'dist/index.js',
      cwd: appDir,
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: '5006',
        // Carregar todas as variáveis do .env.production
        ...envVars,
      },
      error_file: '/var/log/pm2/inspecionasp-backend-error.log',
      out_file: '/var/log/pm2/inspecionasp-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
      // Logs detalhados para debug
      log_type: 'json',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
    // Frontend será servido pelo Nginx diretamente dos arquivos estáticos
    // Não precisa de processo PM2 separado
  ],
};
