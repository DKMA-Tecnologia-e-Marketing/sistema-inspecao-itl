-- Adicionar campos de dias de funcionamento, horários e profissional nos agendamentos
ALTER TABLE `tenants` 
  ADD COLUMN IF NOT EXISTS `diasFuncionamento` json NULL AFTER `iuguAccountId`,
  ADD COLUMN IF NOT EXISTS `horarioInicio` varchar(5) NULL AFTER `diasFuncionamento`,
  ADD COLUMN IF NOT EXISTS `horarioFim` varchar(5) NULL AFTER `horarioInicio`;

ALTER TABLE `appointments` 
  ADD COLUMN IF NOT EXISTS `professionalId` int NULL AFTER `detranAuthorizationId`;

-- Criar índices
CREATE INDEX IF NOT EXISTS `idx_appointments_professional` ON `appointments` (`professionalId`);
CREATE INDEX IF NOT EXISTS `idx_appointments_data_professional` ON `appointments` (`dataAgendamento`, `professionalId`);




