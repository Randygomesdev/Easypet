ALTER TABLE staff ADD COLUMN team_user_id UUID;
ALTER TABLE staff ADD COLUMN team_access_id UUID;
ALTER TABLE staff ADD CONSTRAINT staff_team_access_unique UNIQUE (team_access_id);
ALTER TABLE staff ADD CONSTRAINT staff_team_assignment_pair
    CHECK ((team_user_id IS NULL) = (team_access_id IS NULL));
