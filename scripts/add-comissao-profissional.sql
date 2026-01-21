-- Adicionar campos de comissão e aptidão para profissionais
ALTER TABLE `users` 
  ADD COLUMN `comissaoPercentual` decimal(5,2) NULL AFTER `groupId`,
  ADD COLUMN `aptoParaAtender` boolean NOT NULL DEFAULT true AFTER `comissaoPercentual`;

-- Criar índice para consultas de profissionais aptos
CREATE INDEX `idx_users_apto_operator` ON `users` (`aptoParaAtender`, `role`) WHERE `role` = 'operator';




