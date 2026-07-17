CREATE TABLE users (
id              UUID            PRIMARY KEY
, email         VARCHAR(255)    NOT NULL UNIQUE
, password      VARCHAR(255)    NULL
, name          VARCHAR(255)    NOT NULL
, picture_url   VARCHAR(500)    NULL
, role          VARCHAR (50)    NOT NULL
, active        BOOLEAN         NOT NULL DEFAULT TRUE
, created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
, updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);