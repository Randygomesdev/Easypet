ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS preference_id  VARCHAR(255);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS items_json     TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP WITHOUT TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_preference ON payment_transactions(preference_id);
