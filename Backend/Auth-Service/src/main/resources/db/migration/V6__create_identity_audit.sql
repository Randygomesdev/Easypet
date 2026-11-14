CREATE TABLE identity_audit_events (
    id UUID PRIMARY KEY,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    actor_id UUID NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id UUID NOT NULL,
    target_user_id UUID,
    partner_id UUID,
    action VARCHAR(40) NOT NULL,
    before_active BOOLEAN,
    after_active BOOLEAN,
    before_status VARCHAR(16),
    after_status VARCHAR(16),
    access_role VARCHAR(32),
    reason VARCHAR(300) NOT NULL,
    CONSTRAINT ck_identity_audit_transition CHECK (
        (
            target_type = 'CUSTOMER' AND actor_role = 'ADMIN'
            AND target_user_id IS NOT NULL AND target_user_id = target_id AND partner_id IS NULL
            AND before_status IS NULL AND after_status IS NULL AND access_role IS NULL
            AND (
                (action = 'CUSTOMER_ACTIVATED' AND before_active IS FALSE AND after_active IS TRUE)
                OR (action = 'CUSTOMER_DEACTIVATED' AND before_active IS TRUE AND after_active IS FALSE)
            )
        ) OR (
            target_type = 'TEAM_ACCESS' AND partner_id IS NOT NULL
            AND before_active IS NULL AND after_active IS NULL
            AND access_role IS NOT NULL AND access_role IN ('MANAGER', 'RECEPTION', 'PROFESSIONAL')
            AND after_status IS NOT NULL
            AND (
                (action = 'TEAM_INVITED' AND actor_role = 'PARTNER'
                    AND before_status IS NULL AND after_status = 'PENDING' AND target_user_id IS NULL)
                OR (action = 'TEAM_INVITATION_ACCEPTED' AND actor_role = 'TEAM_MEMBER'
                    AND before_status IS NOT NULL AND before_status = 'PENDING' AND after_status = 'ACTIVE'
                    AND target_user_id IS NOT NULL AND actor_id = target_user_id)
                OR (action = 'TEAM_ACCESS_REVOKED' AND actor_role = 'PARTNER' AND after_status = 'REVOKED'
                    AND before_status IS NOT NULL AND before_status IN ('PENDING', 'EXPIRED', 'ACTIVE')
                    AND (before_status <> 'ACTIVE' OR target_user_id IS NOT NULL))
            )
        )
    )
);

CREATE INDEX idx_identity_audit_time ON identity_audit_events (occurred_at DESC, id DESC);
CREATE INDEX idx_identity_audit_target ON identity_audit_events (target_id, occurred_at DESC, id DESC);
CREATE INDEX idx_identity_audit_actor ON identity_audit_events (actor_id, occurred_at DESC, id DESC);
CREATE INDEX idx_identity_audit_partner ON identity_audit_events (partner_id, occurred_at DESC, id DESC)
    WHERE partner_id IS NOT NULL;
