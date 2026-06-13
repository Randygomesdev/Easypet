-- Modelos de Pacotes criados pelos Parceiros
CREATE TABLE package_templates (
    id UUID PRIMARY KEY,
    partner_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    validity_days INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

-- Transações Financeiras (Mocks de compras nesta fase)
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- CREDIT_CARD, PIX
    status VARCHAR(50) NOT NULL, -- SUCCESS, FAILED
    external_transaction_id VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Saldos e Compras de Pacotes dos Clientes
CREATE TABLE customer_packages (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    package_template_id UUID NOT NULL REFERENCES package_templates(id),
    partner_id UUID NOT NULL,
    service_id UUID NOT NULL,
    total_credits INTEGER NOT NULL,
    remaining_credits INTEGER NOT NULL,
    transaction_id UUID REFERENCES payment_transactions(id),
    expiration_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL, -- ACTIVE, EXPIRED, EXHAUSTED, CANCELLED
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_package_templates_partner ON package_templates(partner_id);
CREATE INDEX idx_customer_packages_user ON customer_packages(user_id);
