CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cnpj` varchar(18),
	`razaoSocial` varchar(255),
	`email` varchar(320),
	`telefone` varchar(20),
	`endereco` text,
	`cidade` varchar(100),
	`estado` varchar(2),
	`cep` varchar(10),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoiceAppointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`appointmentId` int NOT NULL,
	`valor` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoiceAppointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
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
);
