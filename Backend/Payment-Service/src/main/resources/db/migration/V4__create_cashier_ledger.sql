CREATE TABLE cashier_registers (
    partner_id UUID PRIMARY KEY
);

CREATE TABLE cashier_charges (
    id UUID PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES cashier_registers(partner_id),
    booking_id UUID NOT NULL,
    description VARCHAR(160) NOT NULL CHECK (btrim(description) <> ''),
    base_cents BIGINT NOT NULL CHECK (base_cents BETWEEN 0 AND 99999999999),
    extras_cents BIGINT NOT NULL CHECK (extras_cents BETWEEN 0 AND 99999999999),
    discount_cents BIGINT NOT NULL CHECK (discount_cents BETWEEN 0 AND 99999999999),
    created_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL,
    CHECK (discount_cents <= base_cents + extras_cents),
    UNIQUE (partner_id, id),
    UNIQUE (partner_id, booking_id)
);

CREATE INDEX cashier_charges_recent_idx ON cashier_charges (partner_id, created_at DESC, id DESC);

CREATE TABLE cashier_movements (
    id UUID PRIMARY KEY,
    partner_id UUID NOT NULL,
    charge_id UUID NOT NULL,
    business_date DATE NOT NULL,
    type VARCHAR(10) NOT NULL,
    method VARCHAR(12) NOT NULL CHECK (method IN ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER')),
    amount_cents BIGINT NOT NULL,
    reason VARCHAR(300),
    reverses_receipt_id UUID,
    created_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL,
    CHECK (
        (type = 'RECEIPT' AND amount_cents BETWEEN 1 AND 99999999999
            AND reason IS NULL AND reverses_receipt_id IS NULL)
        OR
        (type = 'REVERSAL' AND amount_cents BETWEEN -99999999999 AND -1
            AND reason IS NOT NULL AND btrim(reason) <> '' AND reverses_receipt_id IS NOT NULL)
    ),
    UNIQUE (partner_id, charge_id, id),
    UNIQUE (reverses_receipt_id),
    FOREIGN KEY (partner_id, charge_id) REFERENCES cashier_charges(partner_id, id),
    FOREIGN KEY (partner_id, charge_id, reverses_receipt_id) REFERENCES cashier_movements(partner_id, charge_id, id)
);

CREATE INDEX cashier_movements_by_day_idx
    ON cashier_movements (partner_id, business_date, created_at DESC, id DESC);

CREATE TABLE cashier_closings (
    id UUID PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES cashier_registers(partner_id),
    business_date DATE NOT NULL,
    closed_at TIMESTAMPTZ NOT NULL,
    closed_by UUID NOT NULL,
    UNIQUE (partner_id, business_date)
);

CREATE TABLE cashier_commands (
    partner_id UUID NOT NULL REFERENCES cashier_registers(partner_id),
    idempotency_key UUID NOT NULL,
    actor_id UUID NOT NULL,
    fingerprint BYTEA NOT NULL,
    result_id UUID NOT NULL,
    PRIMARY KEY (partner_id, idempotency_key)
);
