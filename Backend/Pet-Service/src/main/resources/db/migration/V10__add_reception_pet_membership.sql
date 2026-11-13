ALTER TABLE pets
    ADD COLUMN reception_customer_id UUID,
    ADD COLUMN reception_partner_id UUID,
    ADD COLUMN reception_name_key VARCHAR(510),
    ALTER COLUMN owner_id DROP NOT NULL,
    ADD CONSTRAINT pets_reception_membership_check CHECK (
        (reception_customer_id IS NULL AND reception_partner_id IS NULL
            AND reception_name_key IS NULL AND owner_id IS NOT NULL)
        OR (reception_customer_id IS NOT NULL AND reception_partner_id IS NOT NULL
            AND reception_name_key IS NOT NULL)
    );

CREATE UNIQUE INDEX pets_reception_identity_unique
    ON pets (reception_partner_id, reception_customer_id, reception_name_key, species, birth_date)
    WHERE reception_customer_id IS NOT NULL AND active;
