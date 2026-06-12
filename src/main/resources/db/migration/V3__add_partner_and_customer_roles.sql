ALTER TABLE users
    ADD CONSTRAINT chk_user_role
    CHECK (role IN ('ADMIN', 'USER', 'CUSTOMER', 'PARTNER'));
