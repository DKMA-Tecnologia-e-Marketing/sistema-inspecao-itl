CREATE TABLE `inspectionTypeTenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspectionTypeId` int NOT NULL,
	`tenantId` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspectionTypeTenants_id` PRIMARY KEY(`id`)
);
