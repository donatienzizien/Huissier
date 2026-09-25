-- Migration Sprint 4 — colonnes de suivi des rappels d'agenda, pour les
-- cabinets provisionnés AVANT cette évolution.
-- Usage: node scripts/apply-tenant-migration.js prisma/migrations-tenant/sprint4-rappels-envoyes.sql

ALTER TABLE "{{SCHEMA}}".evenements
  ADD COLUMN IF NOT EXISTS rappel_j1_envoye BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rappel_j7_envoye BOOLEAN NOT NULL DEFAULT FALSE;
