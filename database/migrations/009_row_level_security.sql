-- 009_row_level_security.sql
-- Cierra las tablas a la API automática de Supabase.
--
-- Supabase publica el esquema `public` mediante PostgREST: con la clave
-- pública (`anon`), que viaja en cualquier cliente, se podría leer o escribir
-- directamente en `users`, `pets`, etc. PetMatch no usa esa API; todo pasa por
-- el backend, que se conecta como propietario de las tablas.
--
-- Se activa RLS sin políticas: para los roles de la API automática no hay
-- ninguna fila visible, mientras que el propietario de las tablas (el backend)
-- no se ve afectado porque RLS no se aplica al dueño salvo con FORCE.
-- En un PostgreSQL normal (local, CI, Render) no cambia nada.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  -- Además se retiran los permisos a los roles de Supabase, si existen.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
  END IF;
END
$$;
