-- 008_dates_in_utc.sql
-- Fija las fechas automáticas en UTC, independientes del huso del servidor.
--
-- `CURRENT_DATE` devuelve la fecha según la zona horaria de la sesión de
-- PostgreSQL, que depende de dónde esté alojada la base. El modo memoria, en
-- cambio, calculaba siempre la fecha UTC. Con la base en UTC+14 una misma
-- adopción quedaba registrada el día 27 en PostgreSQL y el 26 en memoria: los
-- dos motores discrepaban, y la fecha dependía del alojamiento en lugar de
-- los hechos.
--
-- Se ancla todo a UTC: es la referencia que no cambia al mover el servidor y
-- la que ya usaba el otro motor. La interfaz sigue mostrando las fechas en el
-- huso de quien mira.

ALTER TABLE pets
  ALTER COLUMN admitted_at SET DEFAULT (now() AT TIME ZONE 'UTC')::date;

ALTER TABLE adoptions
  ALTER COLUMN adopted_at SET DEFAULT (now() AT TIME ZONE 'UTC')::date;

-- La restricción de fecha de nacimiento futura usaba el mismo criterio: con
-- el servidor por delante de UTC aceptaba un día que para la aplicación
-- todavía no ha llegado.
ALTER TABLE pets DROP CONSTRAINT IF EXISTS pets_birth_date_not_future;
ALTER TABLE pets
  ADD CONSTRAINT pets_birth_date_not_future
  CHECK (birth_date IS NULL OR birth_date <= (now() AT TIME ZONE 'UTC')::date);
