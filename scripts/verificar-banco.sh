#!/bin/bash
set -e

echo "=========================================="
echo "🔍 Verificando Status do Banco de Dados"
echo "=========================================="
echo ""

# Verificar se DATABASE_URL está definida
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não está definida"
  echo ""
  echo "Verificando arquivos .env..."
  if [ -f ".env" ]; then
    echo "✅ Arquivo .env encontrado"
    if grep -q "DATABASE_URL" .env; then
      echo "✅ DATABASE_URL encontrada no .env"
      DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2-)
      echo "   Valor: ${DATABASE_URL:0:30}..."
    else
      echo "❌ DATABASE_URL não encontrada no .env"
    fi
  else
    echo "❌ Arquivo .env não encontrado"
  fi
  
  if [ -f ".env.production" ]; then
    echo "✅ Arquivo .env.production encontrado"
    if grep -q "DATABASE_URL" .env.production; then
      echo "✅ DATABASE_URL encontrada no .env.production"
      DATABASE_URL=$(grep "^DATABASE_URL=" .env.production | cut -d '=' -f2-)
      echo "   Valor: ${DATABASE_URL:0:30}..."
    else
      echo "❌ DATABASE_URL não encontrada no .env.production"
    fi
  fi
else
  echo "✅ DATABASE_URL está definida: ${DATABASE_URL:0:30}..."
fi

echo ""
echo "=========================================="
echo "🧪 Testando Conexão com o Banco"
echo "=========================================="
echo ""

# Extrair informações da URL do banco
if [ -n "$DATABASE_URL" ]; then
  # Formato: mysql://user:password@host:port/database
  DB_INFO=$(echo "$DATABASE_URL" | sed 's|mysql://||')
  DB_USER=$(echo "$DB_INFO" | cut -d '@' -f1 | cut -d ':' -f1)
  DB_HOST=$(echo "$DB_INFO" | cut -d '@' -f2 | cut -d ':' -f1)
  DB_PORT=$(echo "$DB_INFO" | cut -d '@' -f2 | cut -d ':' -f2 | cut -d '/' -f1)
  DB_NAME=$(echo "$DB_INFO" | cut -d '/' -f2)
  
  echo "Host: $DB_HOST"
  echo "Port: ${DB_PORT:-3306}"
  echo "Database: $DB_NAME"
  echo "User: $DB_USER"
  echo ""
  
  # Tentar conectar usando mysql client (se disponível)
  if command -v mysql &> /dev/null; then
    echo "Tentando conectar com mysql client..."
    if mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -e "SELECT 1" "$DB_NAME" 2>/dev/null; then
      echo "✅ Conexão bem-sucedida!"
      echo ""
      echo "Verificando tabelas..."
      TABLES=$(mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -e "SHOW TABLES" "$DB_NAME" 2>/dev/null | wc -l)
      echo "   Tabelas encontradas: $((TABLES - 1))"
      
      # Verificar tabela tenants especificamente
      if mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -e "DESCRIBE tenants" "$DB_NAME" 2>/dev/null | grep -q "nome"; then
        echo "✅ Tabela 'tenants' existe e tem estrutura correta"
      else
        echo "❌ Tabela 'tenants' não existe ou está incorreta"
      fi
    else
      echo "❌ Falha na conexão"
      echo "   Verifique se:"
      echo "   - O MySQL está rodando"
      echo "   - As credenciais estão corretas"
      echo "   - O banco de dados existe"
    fi
  else
    echo "⚠️  mysql client não está instalado, pulando teste de conexão"
  fi
else
  echo "⚠️  Não é possível testar conexão sem DATABASE_URL"
fi

echo ""
echo "=========================================="
echo "📋 Verificando Código da Aplicação"
echo "=========================================="
echo ""

# Verificar se getDb está sendo chamado corretamente
if grep -q "getDb()" server/db.ts; then
  echo "✅ Função getDb() encontrada em server/db.ts"
else
  echo "❌ Função getDb() não encontrada"
fi

if grep -q "process.env.DATABASE_URL" server/db.ts; then
  echo "✅ Código usa process.env.DATABASE_URL"
else
  echo "❌ Código não usa process.env.DATABASE_URL"
fi

echo ""
echo "=========================================="
echo "✅ Verificação Concluída"
echo "=========================================="






