CREATE TABLE `inspectionLineCapabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspectionLineId` int NOT NULL,
	`inspectionTypeId` int NOT NULL,
	`capacidade` int NOT NULL DEFAULT 0,
	`observacoes` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspectionLineCapabilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspectionLines` (
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
);
--> statement-breakpoint
CREATE TABLE `inspectionTypePrices` (
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
);
--> statement-breakpoint
CREATE TABLE `inspectionTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`categoria` varchar(100),
	`descricao` text,
	`precoBase` int NOT NULL,
	`variacaoMaxima` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspectionTypes_id` PRIMARY KEY(`id`)
);
