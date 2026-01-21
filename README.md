# Sistema de Agendamento de Inspeções ITL

Sistema multitenant completo para agendamento e gestão de inspeções veiculares, desenvolvido com **React** e **Node.js**.

## 🚀 Características Principais

### Arquitetura Multitenant
- Isolamento completo de dados por estabelecimento (tenant)
- Suporte a múltiplas ITLs com configurações independentes
- Sistema de permissões baseado em roles (Admin, Operador, Usuário)

### Backend (Node.js + tRPC)
- **21 tabelas** no banco de dados MySQL/TiDB
- API type-safe com tRPC 11
- Autenticação via Manus OAuth
- Queries otimizadas com Drizzle ORM
- Procedures protegidas por role (admin, tenant, public)

### Frontend (React 19)
- Interface moderna com Tailwind CSS 4
- Componentes reutilizáveis com shadcn/ui
- Portal público para agendamento de clientes
- Área administrativa completa
- Design responsivo e acessível

## 📋 Módulos Implementados

### Portal do Cliente
- **Página Inicial**: Landing page com informações sobre o serviço
- **Fluxo de Agendamento**: Processo em 5 etapas
  1. Seleção de localização/estabelecimento
  2. Dados do veículo (placa, Renavam, chassi)
  3. Dados do cliente (nome, CPF, e-mail, telefone)
  4. Seleção do escopo de vistoria
  5. Pagamento (preparado para integração ASAAS)

### Área Administrativa
- **Dashboard**: Visão geral com estatísticas
- **Gestão de Estabelecimentos**: CRUD completo de ITLs
- **Gestão de Categorias**: Organização de tipos de serviço
- **Gestão de Serviços**: Cadastro de serviços oferecidos
- **Gestão de Tipos de Inspeção**: Cadastro de modalidades, preço base e faixas de variação
- **Gestão de Linhas de Inspeção**: Configuração das linhas por ITL com capacidades por tipo
- **Configuração de Preços**: Tabela de preços por estabelecimento com validação de faixa
- **Configuração de Split**: Divisão de pagamentos entre tenant e plataforma

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais
- **tenants** – Estabelecimentos ITL
- **users** – Usuários do sistema
- **customers** – Clientes/Declarantes
- **vehicles** – Veículos cadastrados
- **appointments** – Agendamentos
- **serviceCategories** – Categorias de serviço
- **services** – Serviços oferecidos
- **inspectionScopes** – Escopos de vistoria
- **inspectionScopeServices** – Relação escopo-serviço
- **inspectionTypes** – Tipos de inspeção (GNV, Sinistro, etc.)
- **inspectionLines** – Linhas de inspeção por ITL (leve, mista, pesado…)
- **inspectionLineCapabilities** – Capacidades por linha/tipo
- **inspectionTypePrices** – Configuração de preços por ITL com faixa controlada
- **priceConfigurations** – Configuração de preços por serviço
- **payments** – Pagamentos
- **paymentSplits** – Divisão de pagamentos
- **splitConfigurations** – Regras de split
- **detranAuthorizations** – Autorizações Detran
- **auditLogs** – Logs de auditoria
- **whatsappMessages** – Mensagens WhatsApp
- **financialReconciliations** – Conciliações financeiras
- **reports** – Relatórios
- **roles / permissions / rolePermissions** – Controle de acesso

## 🔧 Tecnologias Utilizadas

### Backend
- Node.js 22
- Express 4
- tRPC 11
- Drizzle ORM
- MySQL2
- Zod (validação)

### Frontend
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- Wouter (roteamento)
- TanStack Query

## 📦 Dados de Seed

O sistema já vem populado com dados de exemplo:
- 3 estabelecimentos ITL (São Paulo Centro, Zona Norte e Guarulhos)
- 3 categorias de serviço
- 4 serviços
- 6 escopos de vistoria (Inmetro, Prefeituras, Mercosul, Técnica)
- 4 tipos de inspeção (GNV, Sinistro/Modificado, Periódico, Inclusão caminhões) com faixa de preço configurada
- Linhas de inspeção iniciais para os estabelecimentos (leve, pesado, mista)
- Configurações de preço e split

## 🎯 Próximos Passos

### Integrações Pendentes
- [ ] API Infosimples (consulta de dados veiculares)
- [ ] ASAAS (gateway de pagamento e split)
- [ ] WhatsApp Business API
- [ ] Serviço de envio de SMS
- [ ] Serviço de envio de e-mail

### Funcionalidades Adicionais
- [ ] Dashboard do cliente
- [ ] Histórico de agendamentos
- [ ] Gestão de usuários e permissões
- [ ] Módulo de relatórios
- [ ] Conciliação financeira
- [ ] Logs de auditoria

## 📝 Como Usar

### Desenvolvimento
```bash
# Instalar dependências
pnpm install

# Aplicar migrations
pnpm db:push

# Popular banco de dados
node scripts/seed-simple.mjs

# (Opcional) Criar usuário admin manual
node scripts/create-admin.mjs --email admin@itl.com.br --nome "Administrador ITL"

# Iniciar servidor de desenvolvimento
pnpm dev
```

> Após atualizações de esquema, lembre-se de executar `pnpm db:push`.

### Script de criação de admin

Para garantir um usuário administrador inicial (caso ainda não exista na base):

```bash
node scripts/create-admin.mjs --email admin@itl.com.br --nome "Administrador ITL"
# Forçar atualização de um usuário existente:
node scripts/create-admin.mjs --email admin@itl.com.br --force
```

O script utiliza o `DATABASE_URL` do `.env` e cria (ou atualiza) o usuário com role `admin`, permitindo acessar `/admin` e configurar as ITLs.

### Acessar o Sistema
- **Portal Público**: `/`
- **Agendamento**: `/agendar`
- **Área Administrativa**: `/admin` (requer login como admin)

## 🔐 Controle de Acesso

### Roles Disponíveis
- **admin**: Acesso completo ao sistema
- **operator**: Acesso ao tenant específico
- **user**: Acesso limitado (cliente)

### Procedures Protegidas
- `adminProcedure`: Apenas administradores
- `tenantProcedure`: Operadores e administradores
- `protectedProcedure`: Usuários autenticados
- `publicProcedure`: Acesso público

## 📄 Licença

Sistema desenvolvido para gestão de inspeções veiculares ITL.
