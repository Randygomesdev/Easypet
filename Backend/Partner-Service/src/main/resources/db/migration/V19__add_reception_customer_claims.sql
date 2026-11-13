ALTER TABLE reception_customers ADD COLUMN claimed_user_id UUID;
ALTER TABLE reception_customers ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reception_customers ADD CONSTRAINT reception_customer_claim_pair
    CHECK ((claimed_user_id IS NULL) = (claimed_at IS NULL));
CREATE INDEX reception_customer_claimed_user_idx ON reception_customers (claimed_user_id);

CREATE TABLE reception_customer_claims (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES reception_customers(id),
    partner_id UUID NOT NULL REFERENCES partners(id),
    target_user_id UUID NOT NULL,
    issued_by UUID NOT NULL,
    digest VARCHAR(64) NOT NULL UNIQUE,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX reception_customer_claims_customer_idx ON reception_customer_claims (customer_id);
