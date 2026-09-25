-- Ajoute :
--   (1) une colonne docx_path sur les actes, pour le format Word modifiable
--       généré en même temps que le PDF ;
--   (2) une table pieces_jointes pour numériser/importer les actes déjà
--       signés et tout document important à rattacher à un dossier
--       (pièce d'identité, justificatif...).
--
-- Usage : node scripts/apply-tenant-migration.js prisma/migrations-tenant/word-et-pieces-jointes.sql

ALTER TABLE "{{SCHEMA}}".actes
  ADD COLUMN IF NOT EXISTS docx_path TEXT;

DO $$ BEGIN
  CREATE TYPE "{{SCHEMA}}".categorie_piece_jointe AS ENUM (
    'ACTE_SIGNE_RETOURNE', 'PIECE_IDENTITE', 'JUSTIFICATIF', 'AUTRE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".pieces_jointes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id     UUID NOT NULL REFERENCES "{{SCHEMA}}".dossiers(id) ON DELETE CASCADE,
  categorie      "{{SCHEMA}}".categorie_piece_jointe NOT NULL DEFAULT 'AUTRE',
  nom_original   TEXT NOT NULL,
  chemin_fichier TEXT NOT NULL,
  type_mime      TEXT NOT NULL,
  taille_octets  INTEGER NOT NULL,
  televerse_par  UUID REFERENCES "{{SCHEMA}}".utilisateurs(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pieces_jointes_dossier ON "{{SCHEMA}}".pieces_jointes(dossier_id);
