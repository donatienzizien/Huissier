-- Ajoute : (1) les nouveaux types d'actes — lettres client pour signature
-- (mandat de recouvrement, procuration, convention d'honoraires, accusé de
-- réception de dossier), (2) le suivi d'envoi/signature côté client sur les
-- actes existants.
-- Usage: node scripts/apply-tenant-migration.js prisma/migrations-tenant/lettres-client-signature.sql

ALTER TYPE "{{SCHEMA}}".type_acte ADD VALUE IF NOT EXISTS 'LETTRE_MISSION';
ALTER TYPE "{{SCHEMA}}".type_acte ADD VALUE IF NOT EXISTS 'PROCURATION';
ALTER TYPE "{{SCHEMA}}".type_acte ADD VALUE IF NOT EXISTS 'CONVENTION_HONORAIRES';
ALTER TYPE "{{SCHEMA}}".type_acte ADD VALUE IF NOT EXISTS 'ACCUSE_RECEPTION_DOSSIER';

ALTER TABLE "{{SCHEMA}}".actes
  ADD COLUMN IF NOT EXISTS envoye_client_le TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signe_client_le TIMESTAMPTZ;
