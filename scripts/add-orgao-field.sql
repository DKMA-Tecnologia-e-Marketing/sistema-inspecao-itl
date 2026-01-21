-- Adicionar campo orgao na tabela inspectionTypes
ALTER TABLE `inspectionTypes` 
ADD COLUMN `orgao` VARCHAR(255) NULL AFTER `descricao`;

