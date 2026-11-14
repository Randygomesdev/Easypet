CREATE TABLE notification_preference (
    user_id UUID PRIMARY KEY,
    booking_email BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE operations_inbox (
    id UUID PRIMARY KEY,
    kind VARCHAR(10) NOT NULL CHECK (kind IN ('ALERT', 'TICKET')),
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR')),
    status VARCHAR(16) NOT NULL CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
    dedup_scope VARCHAR(60) NOT NULL,
    event_key UUID NOT NULL,
    source VARCHAR(24),
    service VARCHAR(24),
    signal_sequence BIGINT,
    signal_state VARCHAR(12),
    code VARCHAR(40),
    correlation_id UUID,
    booking_id UUID,
    subject VARCHAR(120),
    message VARCHAR(2000),
    requester_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    read_by UUID,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolution_origin VARCHAR(8),
    resolution_message VARCHAR(2000),
    UNIQUE (dedup_scope, event_key)
);

CREATE INDEX operations_inbox_admin_idx ON operations_inbox (created_at, id);
CREATE INDEX operations_inbox_requester_idx ON operations_inbox (requester_id, created_at, id);
CREATE INDEX operations_inbox_unread_idx ON operations_inbox (read_at);
