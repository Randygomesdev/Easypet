CREATE TABLE reception_customers (
    id UUID PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES partners(id),
    name VARCHAR(150) NOT NULL,
    name_key VARCHAR(300) NOT NULL,
    email VARCHAR(254),
    phone VARCHAR(15),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT reception_customers_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL),
    CONSTRAINT reception_customers_email_unique UNIQUE (partner_id, name_key, email),
    CONSTRAINT reception_customers_phone_unique UNIQUE (partner_id, name_key, phone)
);
