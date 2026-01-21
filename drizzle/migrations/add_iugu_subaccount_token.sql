-- Adicionar campo iuguSubaccountToken na tabela tenants
ALTER TABLE `tenants` 
ADD COLUMN `iuguSubaccountToken` varchar(255) NULL AFTER `iuguAccountId`;
