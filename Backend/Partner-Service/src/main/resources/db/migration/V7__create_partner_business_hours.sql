CREATE TABLE partner_business_hours (
    partner_id UUID NOT NULL,
    day_of_week VARCHAR(15) NOT NULL,
    business_start_hour VARCHAR(5),
    business_end_hour VARCHAR(5),
    lunch_start_hour VARCHAR(5),
    lunch_end_hour VARCHAR(5),
    closed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_partner_business_hours PRIMARY KEY (partner_id, day_of_week),
    CONSTRAINT fk_partner_business_hours_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

-- Migrar dados de parceiros já existentes (Segunda a Sexta)
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed)
SELECT id, 'MONDAY', business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, false FROM partners;

INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed)
SELECT id, 'TUESDAY', business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, false FROM partners;

INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed)
SELECT id, 'WEDNESDAY', business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, false FROM partners;

INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed)
SELECT id, 'THURSDAY', business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, false FROM partners;

INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed)
SELECT id, 'FRIDAY', business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, false FROM partners;

-- Migrar sábado (SATURDAY) - padrão 08:00 as 13:00 sem intervalo
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed)
SELECT id, 'SATURDAY', '08:00', '13:00', NULL, NULL, false FROM partners;

-- Migrar domingo (SUNDAY) - fechado por padrão
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed)
SELECT id, 'SUNDAY', NULL, NULL, NULL, NULL, true FROM partners;

-- Remover colunas antigas da tabela de parceiros para normalização
ALTER TABLE partners DROP COLUMN business_start_hour;
ALTER TABLE partners DROP COLUMN business_end_hour;
ALTER TABLE partners DROP COLUMN lunch_start_hour;
ALTER TABLE partners DROP COLUMN lunch_end_hour;
