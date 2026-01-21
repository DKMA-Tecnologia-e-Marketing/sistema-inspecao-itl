-- Script de migração completa para produção
-- Cria todas as tabelas faltantes baseado no schema do Drizzle

-- Tabelas que já existem serão ignoradas (erro 1050)

-- 1. auditLogs
CREATE TABLE IF NOT EXISTS `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tenantId` int,
	`acao` varchar(255) NOT NULL,
	`modulo` varchar(100) NOT NULL,
	`entidade` varchar(100),
	`entidadeId` int,
	`dadosAntigos` json,
	`dadosNovos` json,
	`ipAddress` varchar(50),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. customers
CREATE TABLE IF NOT EXISTS `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cpf` varchar(14) NOT NULL,
	`email` varchar(320),
	`telefone` varchar(20),
	`emailVerificado` boolean NOT NULL DEFAULT false,
	`telefoneVerificado` boolean NOT NULL DEFAULT false,
	`endereco` text,
	`cep` varchar(10),
	`cidade` varchar(100),
	`estado` varchar(2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. detranAuthorizations
CREATE TABLE IF NOT EXISTS `detranAuthorizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(100) NOT NULL,
	`vehicleId` int NOT NULL,
	`dataEmissao` timestamp NOT NULL,
	`dataValidade` timestamp,
	`status` enum('pendente','aprovada','rejeitada','expirada') NOT NULL DEFAULT 'pendente',
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `detranAuthorizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `detranAuthorizations_codigo_unique` UNIQUE(`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. financialReconciliations
CREATE TABLE IF NOT EXISTS `financialReconciliations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`dataInicio` timestamp NOT NULL,
	`dataFim` timestamp NOT NULL,
	`valorTotal` int NOT NULL,
	`quantidadeTransacoes` int NOT NULL,
	`status` enum('aberto','fechado','conciliado') NOT NULL DEFAULT 'aberto',
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialReconciliations_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. inspectionLines
CREATE TABLE IF NOT EXISTS `inspectionLines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`nome` varchar(255),
	`tipo` enum('leve','mista','pesado','motocicleta','outra') NOT NULL,
	`descricao` text,
	`quantidade` int NOT NULL DEFAULT 1,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspectionLines_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. inspectionScopeServices
CREATE TABLE IF NOT EXISTS `inspectionScopeServices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspectionScopeId` int NOT NULL,
	`serviceId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inspectionScopeServices_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. inspectionScopes
CREATE TABLE IF NOT EXISTS `inspectionScopes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipo` enum('inmetro','prefeitura_sp','prefeitura_guarulhos','mercosul','tecnica') NOT NULL,
	`descricao` text,
	`requerAutorizacaoDetran` boolean NOT NULL DEFAULT false,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspectionScopes_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. inspectionTypePrices
CREATE TABLE IF NOT EXISTS `inspectionTypePrices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`inspectionTypeId` int NOT NULL,
	`preco` int NOT NULL,
	`ultimoAjustePor` int,
	`observacoes` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspectionTypePrices_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. invoiceAppointments
CREATE TABLE IF NOT EXISTS `invoiceAppointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`appointmentId` int NOT NULL,
	`valor` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoiceAppointments_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 10. invoices
CREATE TABLE IF NOT EXISTS `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`companyId` int NOT NULL,
	`numero` varchar(50) NOT NULL,
	`valorTotal` int NOT NULL,
	`formaPagamento` enum('pix','boleto'),
	`status` enum('pendente','pago','cancelado') NOT NULL DEFAULT 'pendente',
	`asaasPaymentId` varchar(100),
	`qrCode` text,
	`boletoUrl` text,
	`dataVencimento` timestamp,
	`dataPagamento` timestamp,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_numero_unique` UNIQUE(`numero`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 11. paymentSplits
CREATE TABLE IF NOT EXISTS `paymentSplits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentId` int NOT NULL,
	`tenantId` int NOT NULL,
	`valor` int NOT NULL,
	`percentual` int,
	`status` enum('pendente','processado','pago','erro') NOT NULL DEFAULT 'pendente',
	`asaasSplitId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentSplits_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 12. payments
CREATE TABLE IF NOT EXISTS `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int NOT NULL,
	`valorTotal` int NOT NULL,
	`status` enum('pendente','processando','aprovado','recusado','estornado') NOT NULL DEFAULT 'pendente',
	`asaasPaymentId` varchar(100),
	`metodoPagamento` varchar(50),
	`dataPagamento` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 13. permissions
CREATE TABLE IF NOT EXISTS `permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`modulo` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_nome_unique` UNIQUE(`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 14. priceConfigurations
CREATE TABLE IF NOT EXISTS `priceConfigurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`serviceId` int NOT NULL,
	`preco` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `priceConfigurations_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 15. reconciliations
CREATE TABLE IF NOT EXISTS `reconciliations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`dataReferencia` date NOT NULL,
	`dataConciliacao` timestamp NOT NULL DEFAULT (now()),
	`totalInspecoesPlataforma` int NOT NULL DEFAULT 0,
	`totalInspecoesGoverno` int NOT NULL DEFAULT 0,
	`inspecoesConciliadas` int NOT NULL DEFAULT 0,
	`inspecoesDivergentes` int NOT NULL DEFAULT 0,
	`inspecoesForaSistema` int NOT NULL DEFAULT 0,
	`status` enum('pendente','em_andamento','concluida','erro') NOT NULL DEFAULT 'pendente',
	`observacoes` text,
	`detalhes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reconciliations_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 16. reports
CREATE TABLE IF NOT EXISTS `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`nome` varchar(255) NOT NULL,
	`tipo` varchar(100) NOT NULL,
	`parametros` json,
	`dados` json,
	`geradoPor` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 17. rolePermissions
CREATE TABLE IF NOT EXISTS `rolePermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roleId` int NOT NULL,
	`permissionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rolePermissions_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 18. roles
CREATE TABLE IF NOT EXISTS `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_nome_unique` UNIQUE(`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 19. serviceCategories
CREATE TABLE IF NOT EXISTS `serviceCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceCategories_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 20. services
CREATE TABLE IF NOT EXISTS `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`categoryId` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 21. splitConfigurations
CREATE TABLE IF NOT EXISTS `splitConfigurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`serviceId` int NOT NULL,
	`percentualTenant` int NOT NULL,
	`percentualPlataforma` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `splitConfigurations_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 22. userGroups
CREATE TABLE IF NOT EXISTS `userGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userGroups_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 23. vehicles
CREATE TABLE IF NOT EXISTS `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`placa` varchar(10) NOT NULL,
	`renavam` varchar(20),
	`chassi` varchar(30),
	`marca` varchar(100),
	`modelo` varchar(100),
	`ano` int,
	`cor` varchar(50),
	`customerId` int NOT NULL,
	`dadosInfosimples` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 24. whatsappMessages
CREATE TABLE IF NOT EXISTS `whatsappMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`tenantId` int,
	`appointmentId` int,
	`mensagem` text NOT NULL,
	`direcao` enum('enviada','recebida') NOT NULL,
	`status` enum('pendente','enviada','entregue','lida','erro') NOT NULL DEFAULT 'pendente',
	`whatsappMessageId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsappMessages_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Alterações na tabela users (se necessário)
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','operator') NOT NULL DEFAULT 'user';
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `passwordHash` varchar(255);
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `tenantId` int;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `groupId` int;






