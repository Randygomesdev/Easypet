CREATE TABLE staff (
    id UUID PRIMARY KEY,
    partner_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    photo_url VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_staff_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

CREATE TABLE staff_schedule (
    id UUID PRIMARY KEY,
    staff_id UUID NOT NULL,
    day_of_week INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CONSTRAINT fk_schedule_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

CREATE TABLE staff_service (
    staff_id UUID NOT NULL,
    service_id UUID NOT NULL,
    PRIMARY KEY (staff_id, service_id),
    CONSTRAINT fk_staff_service_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT fk_staff_service_service FOREIGN KEY (service_id) REFERENCES partner_services(id) ON DELETE CASCADE
);

CREATE TABLE staff_absence (
    id UUID PRIMARY KEY,
    staff_id UUID NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    reason VARCHAR(255),
    CONSTRAINT fk_absence_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);
