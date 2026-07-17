CREATE TABLE pets (
  id            UUID                PRIMARY KEY
, name          VARCHAR(255)        NOT NULL
, species       VARCHAR(50)         NOT NULL
, breed         VARCHAR(255)        NOT NULL
, gender        VARCHAR(20)         NOT NULL
, weight        DOUBLE PRECISION    NOT NULL
, birth_date    DATE                NOT NULL
, picture_url   TEXT
,active         BOOLEAN             NOT NULL DEFAULT TRUE
, owner_id      UUID                NOT NULL
, created_at    TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
, updated_at    TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
);