CREATE TABLE cashier_approved_extras (
    id UUID PRIMARY KEY,
    partner_id UUID NOT NULL,
    charge_id UUID NOT NULL,
    approval_id UUID NOT NULL,
    approval_version INTEGER NOT NULL CHECK (approval_version > 0),
    description VARCHAR(300) NOT NULL CHECK (btrim(description) <> ''),
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 100),
    unit_price_cents BIGINT NOT NULL CHECK (unit_price_cents BETWEEN 1 AND 100000000),
    amount_cents BIGINT NOT NULL CHECK (amount_cents BETWEEN 1 AND 99999999999),
    accepted_at TIMESTAMPTZ NOT NULL,
    accepted_by UUID NOT NULL,
    tutor_id UUID NOT NULL,
    tutor_identity_type VARCHAR(20) NOT NULL CHECK (tutor_identity_type IN ('AUTH_USER', 'RECEPTION_CUSTOMER')),
    channel VARCHAR(32) NOT NULL CHECK (btrim(channel) <> ''),
    applied_at TIMESTAMPTZ NOT NULL,
    applied_by UUID NOT NULL,
    CHECK (amount_cents = quantity * unit_price_cents),
    FOREIGN KEY (partner_id, charge_id) REFERENCES cashier_charges(partner_id, id),
    UNIQUE (partner_id, approval_id)
);

CREATE INDEX cashier_approved_extras_by_charge_idx
    ON cashier_approved_extras (partner_id, charge_id, applied_at, id);
