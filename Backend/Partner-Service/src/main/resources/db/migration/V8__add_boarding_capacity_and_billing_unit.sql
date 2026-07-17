-- Migração para adicionar controle de capacidade de hospedagem e unidade de cobrança de serviços

ALTER TABLE partners ADD COLUMN boarding_capacity INTEGER DEFAULT 0;

ALTER TABLE partner_services ADD COLUMN billing_unit VARCHAR(50) DEFAULT 'HOURLY';
