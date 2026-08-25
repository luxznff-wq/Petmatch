-- 004_activity.sql
-- Notificaciones internas (§51) y auditoría (§52).

CREATE TABLE notifications (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  link       VARCHAR(300),
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  -- SET NULL: la evidencia de la acción sobrevive al borrado de la cuenta.
  user_id     BIGINT REFERENCES users (id) ON DELETE SET NULL,
  user_email  VARCHAR(180),
  action      VARCHAR(160) NOT NULL,
  entity_type VARCHAR(80),
  entity_id   BIGINT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
