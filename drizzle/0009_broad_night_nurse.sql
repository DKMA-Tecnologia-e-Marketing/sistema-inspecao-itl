CREATE TABLE `inspectionReportPhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`tipo` enum('traseira','dianteira','placa','panoramica') NOT NULL,
	`filePath` varchar(500) NOT NULL,
	`fileName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inspectionReportPhotos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspectionReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int NOT NULL,
	`orgaoId` int NOT NULL,
	`numeroCertificado` varchar(50),
	`numeroLaudo` varchar(50),
	`dataEmissao` timestamp NOT NULL DEFAULT (now()),
	`dataValidade` timestamp,
	`responsavelTecnico` varchar(255),
	`cft` varchar(50),
	`crea` varchar(50),
	`pdfPath` varchar(500),
	`status` enum('rascunho','gerado','assinado') NOT NULL DEFAULT 'rascunho',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspectionReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orgaos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`sigla` varchar(50),
	`descricao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orgaos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userOrgaos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orgaoId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userOrgaos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','operator','orgao') NOT NULL DEFAULT 'user';