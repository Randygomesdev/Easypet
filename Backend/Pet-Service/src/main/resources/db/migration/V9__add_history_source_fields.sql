ALTER TABLE appointments   ADD COLUMN IF NOT EXISTS source       VARCHAR(10);
ALTER TABLE appointments   ADD COLUMN IF NOT EXISTS partner_name VARCHAR(255);
ALTER TABLE appointments   ADD COLUMN IF NOT EXISTS booking_id   UUID;

ALTER TABLE weight_records ADD COLUMN IF NOT EXISTS source       VARCHAR(10);
ALTER TABLE weight_records ADD COLUMN IF NOT EXISTS partner_name VARCHAR(255);
ALTER TABLE weight_records ADD COLUMN IF NOT EXISTS booking_id   UUID;

ALTER TABLE vaccines       ADD COLUMN IF NOT EXISTS source       VARCHAR(10);
ALTER TABLE vaccines       ADD COLUMN IF NOT EXISTS partner_name VARCHAR(255);
ALTER TABLE vaccines       ADD COLUMN IF NOT EXISTS booking_id   UUID;

ALTER TABLE medications    ADD COLUMN IF NOT EXISTS source       VARCHAR(10);
ALTER TABLE medications    ADD COLUMN IF NOT EXISTS partner_name VARCHAR(255);
ALTER TABLE medications    ADD COLUMN IF NOT EXISTS booking_id   UUID;

ALTER TABLE exams          ADD COLUMN IF NOT EXISTS source       VARCHAR(10);
ALTER TABLE exams          ADD COLUMN IF NOT EXISTS partner_name VARCHAR(255);
ALTER TABLE exams          ADD COLUMN IF NOT EXISTS booking_id   UUID;

ALTER TABLE surgeries      ADD COLUMN IF NOT EXISTS source       VARCHAR(10);
ALTER TABLE surgeries      ADD COLUMN IF NOT EXISTS partner_name VARCHAR(255);
ALTER TABLE surgeries      ADD COLUMN IF NOT EXISTS booking_id   UUID;
