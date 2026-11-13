CREATE TABLE notification_booking (
    id UUID PRIMARY KEY,
    booking_version BIGINT NOT NULL,
    partner_id UUID NOT NULL,
    user_id UUID
);

CREATE TABLE notification_event (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES notification_booking(id),
    booking_version BIGINT NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (booking_id, booking_version)
);

CREATE TABLE notification_delivery (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES notification_event(id),
    booking_id UUID NOT NULL REFERENCES notification_booking(id),
    booking_version BIGINT NOT NULL,
    type VARCHAR(24) NOT NULL,
    status VARCHAR(24) NOT NULL,
    booking_date TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    cycle_attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error VARCHAR(48),
    UNIQUE (event_id, type)
);

CREATE INDEX notification_delivery_due_idx ON notification_delivery (status, due_at, id);
CREATE INDEX notification_delivery_booking_idx ON notification_delivery (booking_id, created_at, id);

CREATE TABLE notification_attempt (
    delivery_id UUID NOT NULL REFERENCES notification_delivery(id),
    attempt_number INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    outcome VARCHAR(24) NOT NULL,
    error VARCHAR(48),
    PRIMARY KEY (delivery_id, attempt_number)
);

CREATE TABLE notification_retry (
    delivery_id UUID NOT NULL REFERENCES notification_delivery(id),
    request_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (delivery_id, request_id)
);

CREATE TABLE notification_local_mail (
    delivery_id UUID PRIMARY KEY REFERENCES notification_delivery(id),
    recipient VARCHAR(254) NOT NULL,
    subject VARCHAR(128) NOT NULL,
    body VARCHAR(1024) NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE NOT NULL
);
