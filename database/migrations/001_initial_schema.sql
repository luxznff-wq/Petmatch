-- 001_initial_schema.sql
-- Tipos base, catálogo de roles, usuarios y refugios.

CREATE TYPE user_status AS ENUM ('ACTIVO', 'SUSPENDIDO');
CREATE TYPE shelter_status AS ENUM ('PENDIENTE', 'VERIFICADO', 'SUSPENDIDO');

-- Catálogo de roles (especificación §53: tabla `roles`).
-- Se modela como tabla y no como ENUM para poder describir cada rol y
-- mantener la relación roles -> users exigida en §54.
CREATE TABLE roles (
  id          SMALLSERIAL PRIMARY KEY,
  name        VARCHAR(30) UNIQUE NOT NULL,
  description VARCHAR(200) NOT NULL
);

INSERT INTO roles (name, description) VALUES
  ('ADOPTANTE',     'Persona que busca adoptar una mascota'),
  ('REFUGIO',       'Organización que publica y gestiona mascotas'),
  ('ADMINISTRADOR', 'Supervisa toda la plataforma');

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  role_id       SMALLINT NOT NULL REFERENCES roles (id),
  first_name    VARCHAR(80) NOT NULL,
  last_name     VARCHAR(80) NOT NULL,
  email         VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone         VARCHAR(30),
  address       VARCHAR(300),
  city          VARCHAR(100),
  avatar_url    TEXT,
  status        user_status NOT NULL DEFAULT 'ACTIVO',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shelters (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    BIGINT UNIQUE NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        VARCHAR(160) NOT NULL,
  logo_url    TEXT,
  description TEXT,
  address     VARCHAR(300),
  city        VARCHAR(100) NOT NULL,
  region      VARCHAR(100),
  phone       VARCHAR(30),
  email       VARCHAR(180),
  website     TEXT,
  social      JSONB NOT NULL DEFAULT '{}'::jsonb,
  hours       VARCHAR(300),
  status      shelter_status NOT NULL DEFAULT 'PENDIENTE',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
