-- 002_pets.sql
-- Mascotas, galería de fotografías y atributos (§18, §19, §20).

CREATE TYPE pet_status AS ENUM ('DISPONIBLE', 'EN_PROCESO', 'ADOPTADA', 'NO_DISPONIBLE');
CREATE TYPE pet_sex   AS ENUM ('Macho', 'Hembra');
CREATE TYPE pet_size  AS ENUM ('Pequeño', 'Mediano', 'Grande');

-- age_group se deriva de birth_date cuando existe; si el refugio no conoce la
-- fecha exacta puede indicar directamente el grupo etario (§15).
CREATE TYPE pet_age_group AS ENUM ('Cachorro', 'Joven', 'Adulto', 'Senior');

CREATE TABLE pets (
  id          BIGSERIAL PRIMARY KEY,
  shelter_id  BIGINT NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  species     VARCHAR(50) NOT NULL,
  breed       VARCHAR(100),
  sex         pet_sex NOT NULL,
  size        pet_size,
  age_group   pet_age_group,
  age_label   VARCHAR(40),
  birth_date  DATE,
  color       VARCHAR(80),
  weight_kg   NUMERIC(6, 2) CHECK (weight_kg > 0),
  description TEXT,
  story       TEXT,
  address     VARCHAR(300),
  city        VARCHAR(100) NOT NULL,
  region      VARCHAR(100),
  status      pet_status NOT NULL DEFAULT 'DISPONIBLE',
  admitted_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pets_birth_date_not_future CHECK (birth_date IS NULL OR birth_date <= CURRENT_DATE)
);

CREATE TABLE pet_images (
  id         BIGSERIAL PRIMARY KEY,
  pet_id     BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Una sola fotografía principal por mascota.
CREATE UNIQUE INDEX pet_images_one_primary
  ON pet_images (pet_id) WHERE is_primary;

CREATE TABLE pet_attributes (
  pet_id             BIGINT PRIMARY KEY REFERENCES pets (id) ON DELETE CASCADE,
  vaccinated         BOOLEAN NOT NULL DEFAULT false,
  sterilized         BOOLEAN NOT NULL DEFAULT false,
  dewormed           BOOLEAN NOT NULL DEFAULT false,
  good_with_children BOOLEAN NOT NULL DEFAULT false,
  good_with_dogs     BOOLEAN NOT NULL DEFAULT false,
  good_with_cats     BOOLEAN NOT NULL DEFAULT false,
  sociable           BOOLEAN NOT NULL DEFAULT false,
  special_care       BOOLEAN NOT NULL DEFAULT false
);
