-- Ajoute la catégorisation d'entité aux clients (particulier / entreprise /
-- banque / bailleur / administration / autre) ainsi que les identifiants
-- propres aux entités (IFU, RCCM), pour les cabinets provisionnés AVANT
-- cette évolution. Le NIN existant reste utilisé pour le CNIB/Passeport
-- des particuliers.
-- Usage: node scripts/apply-tenant-migration.js prisma/migrations-tenant/categorie-entite-client.sql

DO $$ BEGIN
  CREATE TYPE "{{SCHEMA}}".categorie_client AS ENUM ('PARTICULIER', 'ENTREPRISE', 'BANQUE', 'BAILLEUR', 'ADMINISTRATION', 'AUTRE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "{{SCHEMA}}".clients
  ADD COLUMN IF NOT EXISTS categorie "{{SCHEMA}}".categorie_client NOT NULL DEFAULT 'PARTICULIER',
  ADD COLUMN IF NOT EXISTS ifu TEXT,
  ADD COLUMN IF NOT EXISTS rccm TEXT;
