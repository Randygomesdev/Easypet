CREATE UNIQUE INDEX partners_user_id_unique ON partners (user_id) WHERE user_id IS NOT NULL;

CREATE TABLE partner_status_changes (
    id UUID PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES partners(id),
    actor_id UUID NOT NULL,
    previous_active BOOLEAN NOT NULL,
    active BOOLEAN NOT NULL,
    reason VARCHAR(500) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX partner_status_changes_history
    ON partner_status_changes (partner_id, changed_at DESC, id DESC);
