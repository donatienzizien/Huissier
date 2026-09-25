-- Numero WhatsApp pour les relances/messages -- distinct du telephone
-- classique car souvent un numero different (portable personnel vs
-- ligne fixe du cabinet/entreprise).
SET client_encoding TO 'UTF8';

DO $OUTER$
DECLARE
  schema_rec RECORD;
BEGIN
  FOR schema_rec IN
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog','information_schema','public')
  LOOP
    EXECUTE format('ALTER TABLE %I.clients ADD COLUMN IF NOT EXISTS whatsapp TEXT', schema_rec.schema_name);
    RAISE NOTICE 'OK : %.clients.whatsapp', schema_rec.schema_name;
  END LOOP;
END $OUTER$;