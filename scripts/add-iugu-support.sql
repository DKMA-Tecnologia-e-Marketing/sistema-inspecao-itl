-- Script para adicionar suporte à Iugu no banco de dados

-- Adicionar campo iuguPaymentId na tabela payments
ALTER TABLE `payments` 
ADD COLUMN `iuguPaymentId` varchar(100) NULL AFTER `asaasPaymentId`;

-- Adicionar campo iuguPaymentId na tabela invoices
ALTER TABLE `invoices` 
ADD COLUMN `iuguPaymentId` varchar(100) NULL AFTER `asaasPaymentId`;

-- Adicionar campo iuguAccountId na tabela tenants (para split de pagamento)
ALTER TABLE `tenants` 
ADD COLUMN `iuguAccountId` varchar(100) NULL AFTER `asaasWalletId`;

-- Criar índices para melhorar performance
CREATE INDEX `idx_payments_iugu_payment_id` ON `payments` (`iuguPaymentId`);
CREATE INDEX `idx_invoices_iugu_payment_id` ON `invoices` (`iuguPaymentId`);




