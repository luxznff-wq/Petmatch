-- 003_adoptions.sql
-- Favoritos, solicitudes, entrevistas y adopciones (§23, §27-§38).

CREATE TYPE request_status AS ENUM (
  'PENDIENTE', 'EN_REVISION', 'ENTREVISTA',
  'APROBADA', 'RECHAZADA', 'CANCELADA', 'ADOPCION_COMPLETADA'
);
CREATE TYPE interview_modality AS ENUM ('Presencial', 'Videollamada', 'Telefónica');
CREATE TYPE interview_result   AS ENUM ('Pendiente', 'Aprobada', 'No aprobada');
CREATE TYPE housing_type       AS ENUM ('Casa', 'Departamento', 'Otro');

CREATE TABLE favorites (
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  pet_id     BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pet_id)
);

CREATE TABLE adoption_requests (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  pet_id               BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  status               request_status NOT NULL DEFAULT 'PENDIENTE',

  -- Datos personales declarados en la solicitud (§28). Se guardan como copia
  -- histórica: el perfil del usuario puede cambiar después de solicitar.
  applicant_name       VARCHAR(160) NOT NULL,
  applicant_age        SMALLINT NOT NULL CHECK (applicant_age BETWEEN 18 AND 120),
  applicant_phone      VARCHAR(30) NOT NULL,
  applicant_email      VARCHAR(180) NOT NULL,
  applicant_address    VARCHAR(300) NOT NULL,
  applicant_city       VARCHAR(100) NOT NULL,

  -- Información de vivienda (§29).
  housing_type         housing_type NOT NULL,
  has_yard             BOOLEAN NOT NULL,
  lives_alone          BOOLEAN NOT NULL,
  has_other_pets       BOOLEAN NOT NULL,
  has_children         BOOLEAN NOT NULL,

  -- Experiencia (§30) y motivación (§31).
  had_pets_before      BOOLEAN NOT NULL DEFAULT false,
  experience           TEXT,
  motivation           TEXT NOT NULL,

  declaration_accepted BOOLEAN NOT NULL CHECK (declaration_accepted),
  review_notes         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- §30: si declara experiencia previa debe describirla.
  CONSTRAINT adoption_requests_experience_required
    CHECK (NOT had_pets_before OR (experience IS NOT NULL AND length(btrim(experience)) > 0))
);

-- §35.5: no se permiten solicitudes duplicadas activas.
CREATE UNIQUE INDEX adoption_requests_one_active_per_user_pet
  ON adoption_requests (user_id, pet_id)
  WHERE status IN ('PENDIENTE', 'EN_REVISION', 'ENTREVISTA', 'APROBADA');

CREATE TABLE adoption_interviews (
  id           BIGSERIAL PRIMARY KEY,
  request_id   BIGINT NOT NULL REFERENCES adoption_requests (id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  modality     interview_modality NOT NULL,
  notes        TEXT,
  result       interview_result NOT NULL DEFAULT 'Pendiente',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE adoptions (
  id         BIGSERIAL PRIMARY KEY,
  code       VARCHAR(20) UNIQUE,
  request_id BIGINT UNIQUE NOT NULL REFERENCES adoption_requests (id) ON DELETE CASCADE,
  adopted_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- §37: código legible del tipo ADP-00042.
CREATE OR REPLACE FUNCTION set_adoption_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'ADP-' || lpad(NEW.id::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER adoptions_set_code
  BEFORE INSERT ON adoptions
  FOR EACH ROW EXECUTE FUNCTION set_adoption_code();
