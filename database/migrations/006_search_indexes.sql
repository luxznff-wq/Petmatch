-- 006_search_indexes.sql
-- Búsqueda de texto libre indexable (§14).
--
-- Problema que corrige esta migración:
--
-- 1. `pets_name_trgm_idx` (migración 005) era un btree pese a su nombre. Un
--    btree no resuelve `ILIKE '%texto%'`: el comodín inicial lo inutiliza.
--
-- 2. Aunque fuese de trigramas tampoco se habría usado, porque la búsqueda
--    combinaba columnas de dos tablas en un mismo OR
--    (`p.name ILIKE ? OR ... OR s.name ILIKE ?`). Un OR que cruza el JOIN
--    obliga al planificador a recorrer la tabla entera y evaluar la condición
--    después de unir: ningún índice puede ayudar.
--
-- Solución: una columna desnormalizada en `pets` que concentra todo el texto
-- buscable —incluido el nombre del refugio—, mantenida por triggers. La
-- búsqueda pasa a ser un único predicado sobre una sola tabla, que sí puede
-- resolverse con un índice GIN de trigramas.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- `unaccent` iguala el comportamiento con el del modo memoria, que compara
-- sin distinguir acentos: buscar "peru" debe encontrar "Huellitas Perú".
CREATE EXTENSION IF NOT EXISTS unaccent;

DROP INDEX IF EXISTS pets_name_trgm_idx;

ALTER TABLE pets ADD COLUMN search_text TEXT;

/* Texto buscable de una mascota: sus datos más el nombre de su refugio. */
CREATE OR REPLACE FUNCTION pet_search_text(
  p_name TEXT, p_breed TEXT, p_city TEXT, p_region TEXT, p_shelter TEXT
) RETURNS TEXT AS $$
  SELECT unaccent(lower(concat_ws(' ', p_name, p_breed, p_city, p_region, p_shelter)));
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION pets_refresh_search_text() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := pet_search_text(
    NEW.name, NEW.breed, NEW.city, NEW.region,
    (SELECT s.name FROM shelters s WHERE s.id = NEW.shelter_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pets_search_text_refresh
  BEFORE INSERT OR UPDATE OF name, breed, city, region, shelter_id ON pets
  FOR EACH ROW EXECUTE FUNCTION pets_refresh_search_text();

/* Si un refugio cambia de nombre, se refresca el texto de sus mascotas. */
CREATE OR REPLACE FUNCTION shelters_refresh_pets_search_text() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    -- Sólo se toca `search_text`, así que el trigger de `pets` no se dispara
    -- de vuelta: no hay recursión.
    UPDATE pets
       SET search_text = pet_search_text(name, breed, city, region, NEW.name)
     WHERE shelter_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shelters_search_text_refresh
  AFTER UPDATE OF name ON shelters
  FOR EACH ROW EXECUTE FUNCTION shelters_refresh_pets_search_text();

-- Rellena las filas que ya existían.
UPDATE pets p
   SET search_text = pet_search_text(
         p.name, p.breed, p.city, p.region,
         (SELECT s.name FROM shelters s WHERE s.id = p.shelter_id)
       );

CREATE INDEX pets_search_idx ON pets USING gin (search_text gin_trgm_ops);

-- Búsquedas del panel administrativo (§47) y del directorio de refugios.
-- Aquí el OR no cruza tablas, así que basta un índice por columna: el
-- planificador los combina con BitmapOr.
CREATE INDEX users_first_name_search_idx ON users USING gin (first_name gin_trgm_ops);
CREATE INDEX users_last_name_search_idx  ON users USING gin (last_name gin_trgm_ops);
CREATE INDEX users_email_search_idx      ON users USING gin (email gin_trgm_ops);
CREATE INDEX shelters_name_search_idx    ON shelters USING gin (name gin_trgm_ops);
CREATE INDEX shelters_city_search_idx    ON shelters USING gin (city gin_trgm_ops);
