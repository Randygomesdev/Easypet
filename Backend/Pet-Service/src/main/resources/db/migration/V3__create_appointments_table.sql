CREATE TABLE appointments (
    id UUID PRIMARY KEY,
    pet_id UUID NOT NULL,
    date TIMESTAMP NOT NULL,
    reason VARCHAR(255) NOT NULL,
    clinical_notes TEXT,
    vet_name VARCHAR(255),
    provider_id UUID,
    weight_at_time DOUBLE PRECISION,
    status VARCHAR(50) NOT NULL,
    certified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appointments_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);
