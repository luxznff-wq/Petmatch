-- 007_accounts_legal_and_files.sql
-- Verificación de correo, recuperación de contraseña, aceptación de los
-- términos legales y metadatos de las fotografías subidas.

-- ---------------------------------------------------------------- Cuentas

ALTER TABLE users
  ADD COLUMN email_verified_at   TIMESTAMPTZ,
  -- Momento en que la persona aceptó cada documento y versión vigente
  -- entonces. Guardar la versión es lo que permite saber a qué texto se
  -- comprometió: si el documento cambia, el consentimiento anterior no
  -- cubre el nuevo (Ley 29733, consentimiento informado).
  ADD COLUMN terms_accepted_at   TIMESTAMPTZ,
  ADD COLUMN privacy_accepted_at TIMESTAMPTZ,
  ADD COLUMN legal_version       VARCHAR(20);

-- Las cuentas que ya existían aceptaron al registrarse, antes de que hubiera
-- versionado: se marcan con la versión inicial para no dejar el dato vacío.
UPDATE users
   SET terms_accepted_at   = created_at,
       privacy_accepted_at = created_at,
       legal_version       = '1.0'
 WHERE terms_accepted_at IS NULL;

-- ------------------------------------------------- Tokens de un solo uso

CREATE TYPE auth_token_purpose AS ENUM ('VERIFICACION_EMAIL', 'RECUPERACION_PASSWORD');

CREATE TABLE auth_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose    auth_token_purpose NOT NULL,
  -- Se guarda el hash, nunca el token. Quien lea la base de datos no puede
  -- suplantar a nadie, igual que ocurre con las contraseñas.
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Búsqueda por hash de los tokens todavía utilizables.
CREATE UNIQUE INDEX auth_tokens_hash_idx ON auth_tokens (token_hash);
CREATE INDEX auth_tokens_pending_idx
  ON auth_tokens (user_id, purpose) WHERE used_at IS NULL;

-- ------------------------------------------------------------ Fotografías

ALTER TABLE pet_images
  -- Ruta dentro del almacenamiento propio. Queda a NULL cuando la imagen se
  -- registró como enlace externo, que sigue estando permitido.
  ADD COLUMN storage_key TEXT,
  ADD COLUMN mime_type   VARCHAR(80),
  ADD COLUMN size_bytes  INTEGER CHECK (size_bytes IS NULL OR size_bytes > 0);

CREATE INDEX pet_images_storage_idx ON pet_images (storage_key) WHERE storage_key IS NOT NULL;
