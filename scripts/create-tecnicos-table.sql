-- Script para criar a tabela técnicos
-- Inspetor Técnico e Responsável Técnico

CREATE TABLE IF NOT EXISTS `tecnicos` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



