ALTER TABLE partners ADD COLUMN business_start_hour VARCHAR(5) DEFAULT '08:00';
ALTER TABLE partners ADD COLUMN business_end_hour VARCHAR(5) DEFAULT '18:00';
ALTER TABLE partners ADD COLUMN lunch_start_hour VARCHAR(5) DEFAULT '12:00';
ALTER TABLE partners ADD COLUMN lunch_end_hour VARCHAR(5) DEFAULT '13:00';
