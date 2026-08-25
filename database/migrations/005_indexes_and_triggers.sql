-- 005_indexes_and_triggers.sql
-- Índices para búsqueda/filtros/paginación (§14-§17) y mantenimiento de updated_at.

CREATE INDEX pets_status_idx        ON pets (status);
CREATE INDEX pets_species_idx       ON pets (lower(species));
CREATE INDEX pets_city_idx          ON pets (lower(city));
CREATE INDEX pets_shelter_idx       ON pets (shelter_id);
CREATE INDEX pets_created_at_idx    ON pets (created_at DESC);
CREATE INDEX pets_name_trgm_idx     ON pets (lower(name));
CREATE INDEX pet_images_pet_idx     ON pet_images (pet_id);

CREATE INDEX shelters_status_idx    ON shelters (status);
CREATE INDEX shelters_city_idx      ON shelters (lower(city));

CREATE INDEX users_role_idx         ON users (role_id);
CREATE INDEX users_status_idx       ON users (status);

CREATE INDEX favorites_user_idx     ON favorites (user_id, created_at DESC);
CREATE INDEX favorites_pet_idx      ON favorites (pet_id);

CREATE INDEX requests_user_idx      ON adoption_requests (user_id, created_at DESC);
CREATE INDEX requests_pet_idx       ON adoption_requests (pet_id);
CREATE INDEX requests_status_idx    ON adoption_requests (status);

CREATE INDEX interviews_request_idx ON adoption_interviews (request_id);
CREATE INDEX adoptions_date_idx     ON adoptions (adopted_at DESC);

-- Notificaciones sin leer del usuario: sostiene el contador de la campana.
CREATE INDEX notifications_unread_idx
  ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX notifications_user_idx  ON notifications (user_id, created_at DESC);
CREATE INDEX audit_logs_created_idx  ON audit_logs (created_at DESC);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER shelters_touch_updated_at
  BEFORE UPDATE ON shelters FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER pets_touch_updated_at
  BEFORE UPDATE ON pets FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER adoption_requests_touch_updated_at
  BEFORE UPDATE ON adoption_requests FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER adoption_interviews_touch_updated_at
  BEFORE UPDATE ON adoption_interviews FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
