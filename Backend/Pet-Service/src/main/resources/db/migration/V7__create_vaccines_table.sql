CREATE TABLE vaccines (
    id UUID PRIMARY KEY,
    pet_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    application_date DATE NOT NULL,
    next_dose_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    vet_name VARCHAR(255),
    manufacturer VARCHAR(255),
    lot VARCHAR(100),
    observations TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vaccinations_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);
