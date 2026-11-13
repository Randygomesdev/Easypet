ALTER TABLE bookings
    ALTER COLUMN user_id DROP NOT NULL,
    ADD COLUMN reception_customer_id UUID,
    ADD COLUMN scheduled_end TIMESTAMP,
    ADD COLUMN cancellation_reason VARCHAR(500),
    ADD COLUMN no_show_reason VARCHAR(500),
    ADD COLUMN ready_at TIMESTAMP,
    ADD COLUMN event_version BIGINT NOT NULL DEFAULT 0,
    ADD CONSTRAINT booking_customer_source CHECK ((user_id IS NULL) <> (reception_customer_id IS NULL));

DROP INDEX uq_staff_booking_date;
CREATE UNIQUE INDEX uq_staff_booking_date ON bookings (staff_id, booking_date)
    WHERE staff_id IS NOT NULL AND deleted_at IS NULL
      AND status NOT IN ('CANCELLED', 'NO_SHOW') AND NOT is_fitting_request;

CREATE INDEX idx_booking_agenda ON bookings (partner_id, booking_date)
    WHERE deleted_at IS NULL AND status NOT IN ('CANCELLED', 'NO_SHOW');

-- A transaction locks this row before changing any allocation at the establishment.
CREATE TABLE booking_agenda_locks (
    partner_id UUID PRIMARY KEY
);

CREATE TABLE booking_idempotency (
    partner_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    request_key VARCHAR(128) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    booking_id UUID NOT NULL REFERENCES bookings (id),
    PRIMARY KEY (partner_id, actor_id, request_key)
);

CREATE TABLE booking_agenda_blocks (
    id UUID PRIMARY KEY,
    partner_id UUID NOT NULL,
    staff_id UUID,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL CHECK (ends_at > starts_at),
    reason VARCHAR(500) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_booking_agenda_blocks ON booking_agenda_blocks (partner_id, starts_at);

CREATE TABLE booking_check_ins (
    booking_id UUID PRIMARY KEY REFERENCES bookings (id),
    pet_identified BOOLEAN NOT NULL,
    instructions_confirmed BOOLEAN NOT NULL,
    allergies VARCHAR(1000),
    behavior VARCHAR(1000),
    authorized_extras VARCHAR(1000),
    observations VARCHAR(1000),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE booking_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings (id),
    actor_id UUID NOT NULL,
    action VARCHAR(40) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    previous_status VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    previous_booking_date TIMESTAMP,
    booking_date TIMESTAMP NOT NULL,
    previous_scheduled_end TIMESTAMP,
    scheduled_end TIMESTAMP,
    previous_staff_id UUID,
    staff_id UUID,
    reason VARCHAR(500)
);
CREATE INDEX idx_booking_history ON booking_history (booking_id, id);

CREATE TABLE booking_outbox (
    event_id UUID PRIMARY KEY,
    sequence_id BIGINT GENERATED ALWAYS AS IDENTITY,
    booking_id UUID NOT NULL REFERENCES bookings (id),
    booking_version BIGINT NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    partner_id UUID NOT NULL,
    user_id UUID NOT NULL,
    booking_date TIMESTAMP NOT NULL,
    previous_booking_date TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    UNIQUE (booking_id, booking_version)
);
CREATE INDEX idx_booking_outbox_pending ON booking_outbox (sequence_id) WHERE acknowledged_at IS NULL;
