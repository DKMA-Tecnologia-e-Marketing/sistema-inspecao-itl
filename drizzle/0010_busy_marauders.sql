CREATE TABLE `systemConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `systemConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `systemConfig_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `tecnicos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipo` enum('inspetor','responsavel') NOT NULL,
	`nomeCompleto` varchar(255) NOT NULL,
	`cpf` varchar(14) NOT NULL,
	`cft` varchar(50),
	`crea` varchar(50),
	`tenantId` int,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tecnicos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD `companyId` int;--> statement-breakpoint
ALTER TABLE `tenants` ADD `iuguSubaccountToken` varchar(255);