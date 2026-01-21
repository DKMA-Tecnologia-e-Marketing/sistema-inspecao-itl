CREATE TABLE `reconciliationConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`frequencia` enum('diaria','semanal','mensal') NOT NULL,
	`diaSemana` int,
	`diaMes` int,
	`horario` varchar(5),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reconciliationConfig_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reconciliations` (
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
);
