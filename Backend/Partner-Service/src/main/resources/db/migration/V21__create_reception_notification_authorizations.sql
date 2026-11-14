CREATE TABLE reception_notification_authorizations (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES reception_customers(id),
    email VARCHAR(254) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel = 'IN_PERSON'),
    revision BIGINT NOT NULL CHECK (revision > 0),
    granted_by UUID NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_by UUID,
    revoked_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT reception_notification_revocation_pair CHECK ((revoked_by IS NULL) = (revoked_at IS NULL)),
    CONSTRAINT reception_notification_customer_revision UNIQUE (customer_id, revision)
);

CREATE UNIQUE INDEX reception_notification_one_open
    ON reception_notification_authorizations (customer_id) WHERE revoked_at IS NULL;

CREATE INDEX partner_services_catalog_active_partner
    ON partner_services (partner_id) WHERE active = TRUE;
