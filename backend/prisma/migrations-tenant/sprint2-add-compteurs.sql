-- Migration Sprint 2 — à appliquer à tout schéma cabinet provisionné AVANT
-- l'ajout de la table `compteurs` (nouveaux cabinets: déjà inclus dans
-- tenant-schema.sql, rien à faire).
--
-- Utilisation : node scripts/apply-tenant-migration.js sprint2-add-compteurs.sql

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".compteurs (
  cle    TEXT PRIMARY KEY,
  valeur INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".relances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES "{{SCHEMA}}".clients(id) ON DELETE CASCADE,
  envoyee_par UUID REFERENCES "{{SCHEMA}}".utilisateurs(id),
  message     TEXT,
  envoyee_le  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_relances_client ON "{{SCHEMA}}".relances(client_id);
