CREATE TABLE surgeries (
    id UUID PRIMARY KEY,
    pet_id UUID NOT NULL,
    description VARCHAR(255) NOT NULL,
    date TIMESTAMP NOT NULL,
    vet_name VARCHAR(255),
    provider_id UUID,
    anesthesia_type VARCHAR(255),
    post_operative_instructions TEXT,
    status VARCHAR(50),
    certified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_surgeries_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);
