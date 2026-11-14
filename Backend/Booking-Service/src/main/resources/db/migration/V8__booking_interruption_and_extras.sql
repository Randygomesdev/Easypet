ALTER TABLE bookings
    ADD COLUMN interruption_reason VARCHAR(500),
    ADD COLUMN interrupted_at TIMESTAMPTZ,
    ADD COLUMN interrupted_by UUID,
    ADD CONSTRAINT booking_interruption_audit CHECK (
        (status = 'INTERRUPTED' AND interruption_reason IS NOT NULL AND interrupted_at IS NOT NULL AND interrupted_by IS NOT NULL)
        OR (status <> 'INTERRUPTED' AND interruption_reason IS NULL AND interrupted_at IS NULL AND interrupted_by IS NULL)
    );

DROP INDEX uq_staff_booking_date;
CREATE UNIQUE INDEX uq_staff_booking_date ON bookings (staff_id, booking_date)
    WHERE staff_id IS NOT NULL AND deleted_at IS NULL
      AND status NOT IN ('CANCELLED', 'NO_SHOW', 'INTERRUPTED') AND NOT is_fitting_request;

DROP INDEX idx_booking_agenda;
CREATE INDEX idx_booking_agenda ON bookings (partner_id, booking_date)
    WHERE deleted_at IS NULL AND status NOT IN ('CANCELLED', 'NO_SHOW', 'INTERRUPTED');

ALTER TABLE booking_outbox ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE booking_outbox ADD COLUMN reception_customer_id UUID;
ALTER TABLE booking_outbox ADD CONSTRAINT booking_outbox_recipient
    CHECK ((user_id IS NULL) <> (reception_customer_id IS NULL));

CREATE TABLE booking_extras (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings (id),
    partner_id UUID NOT NULL,
    tutor_id UUID NOT NULL,
    tutor_source VARCHAR(20) NOT NULL CHECK (tutor_source IN ('AUTH_USER', 'RECEPTION_CUSTOMER')),
    version INTEGER NOT NULL CHECK (version > 0),
    description VARCHAR(300) NOT NULL CHECK (length(btrim(description)) > 0),
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 100),
    unit_price_cents BIGINT NOT NULL CHECK (unit_price_cents BETWEEN 1 AND 100000000),
    amount_cents BIGINT GENERATED ALWAYS AS (quantity * unit_price_cents) STORED
        CHECK (amount_cents BETWEEN 1 AND 100000000),
    status VARCHAR(12) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
    proposed_by UUID NOT NULL,
    request_key VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decision_at TIMESTAMPTZ,
    decision_by UUID,
    channel VARCHAR(12) CHECK (channel IN ('DIGITAL', 'IN_PERSON')),
    decision_reason VARCHAR(500),
    decision_evidence VARCHAR(500),
    UNIQUE (booking_id, proposed_by, request_key),
    CHECK ((status IN ('APPROVED', 'REJECTED') AND decision_at IS NOT NULL AND decision_by IS NOT NULL AND channel IS NOT NULL)
        OR (status IN ('PENDING', 'EXPIRED') AND decision_at IS NULL AND decision_by IS NULL AND channel IS NULL)),
    CHECK ((channel IS NOT DISTINCT FROM 'IN_PERSON' AND decision_reason IS NOT NULL AND decision_evidence IS NOT NULL)
        OR (channel IS DISTINCT FROM 'IN_PERSON' AND decision_reason IS NULL AND decision_evidence IS NULL))
);

CREATE INDEX idx_booking_extras_page ON booking_extras (booking_id, created_at DESC, id DESC);
CREATE INDEX idx_booking_investigation ON bookings (booking_date DESC, id DESC)
    WHERE deleted_at IS NULL AND status IN ('CANCELLED', 'NO_SHOW', 'INTERRUPTED');
