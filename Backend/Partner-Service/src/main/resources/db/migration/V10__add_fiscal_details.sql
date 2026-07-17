-- Migration to add fiscal/legal details and additional contact fields to partner table
ALTER TABLE partners ADD COLUMN legal_name VARCHAR(255);
ALTER TABLE partners ADD COLUMN state_registration VARCHAR(50);
ALTER TABLE partners ADD COLUMN state_registration_exempt BOOLEAN DEFAULT FALSE;
ALTER TABLE partners ADD COLUMN municipal_registration VARCHAR(50);
ALTER TABLE partners ADD COLUMN municipal_registration_exempt BOOLEAN DEFAULT FALSE;
ALTER TABLE partners ADD COLUMN email VARCHAR(255);
ALTER TABLE partners ADD COLUMN contact_phone VARCHAR(50);

-- Populate legal_name with existing name for compatibility
UPDATE partners SET legal_name = name WHERE legal_name IS NULL;

-- Apply NOT NULL constraint to legal_name
ALTER TABLE partners ALTER COLUMN legal_name SET NOT NULL;
