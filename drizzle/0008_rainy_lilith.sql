ALTER TABLE `appointments` ADD `inspectionTypeId` int;--> statement-breakpoint
ALTER TABLE `appointments` ADD `professionalId` int;--> statement-breakpoint
ALTER TABLE `inspectionTypes` ADD `orgao` varchar(255);--> statement-breakpoint
ALTER TABLE `invoices` ADD `iuguPaymentId` varchar(100);--> statement-breakpoint
ALTER TABLE `payments` ADD `iuguPaymentId` varchar(100);--> statement-breakpoint
ALTER TABLE `tenants` ADD `iuguAccountId` varchar(100);--> statement-breakpoint
ALTER TABLE `tenants` ADD `diasFuncionamento` json;--> statement-breakpoint
ALTER TABLE `tenants` ADD `horarioInicio` varchar(5);--> statement-breakpoint
ALTER TABLE `tenants` ADD `horarioFim` varchar(5);--> statement-breakpoint
ALTER TABLE `users` ADD `comissaoPercentual` decimal(5,2);--> statement-breakpoint
ALTER TABLE `users` ADD `aptoParaAtender` boolean DEFAULT true NOT NULL;