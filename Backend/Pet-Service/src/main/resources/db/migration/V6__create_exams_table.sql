CREATE TABLE exams (
    id UUID PRIMARY KEY,
    pet_id UUID NOT NULL,
    exam_name VARCHAR(255) NOT NULL,
    date TIMESTAMP NOT NULL,
    laboratory VARCHAR(255),
    vet_name VARCHAR(255),
    results_summary TEXT,
    file_url TEXT,
    certified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_exams_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);
