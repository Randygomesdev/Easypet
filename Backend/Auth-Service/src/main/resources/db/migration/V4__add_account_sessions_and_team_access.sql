ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users DROP CONSTRAINT chk_user_role;
ALTER TABLE users ADD CONSTRAINT chk_user_role
    CHECK (role IN ('ADMIN', 'USER', 'CUSTOMER', 'PARTNER', 'TEAM_MEMBER'));

UPDATE password_reset_tokens SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex');
ALTER TABLE password_reset_tokens ADD COLUMN used_at TIMESTAMP;
ALTER TABLE password_reset_tokens ADD COLUMN replaced_at TIMESTAMP;
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);

CREATE TABLE team_accesses (
    id UUID PRIMARY KEY,
    partner_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    access_role VARCHAR(32) NOT NULL CHECK (access_role IN ('MANAGER', 'RECEPTION', 'PROFESSIONAL')),
    status VARCHAR(16) NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED')),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id UUID REFERENCES users (id),
    created_by UUID NOT NULL REFERENCES users (id),
    revoked_by UUID REFERENCES users (id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_team_accesses_partner ON team_accesses (partner_id);
CREATE UNIQUE INDEX uq_team_accesses_current ON team_accesses (partner_id, email)
    WHERE status IN ('PENDING', 'ACTIVE');
CREATE UNIQUE INDEX uq_team_accesses_active_user ON team_accesses (user_id) WHERE status = 'ACTIVE';
