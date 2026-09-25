-- Détails d'identité pour les clients/débiteurs — tous facultatifs, pour
-- ne jamais bloquer la création d'une fiche si l'information manque.
-- Particuliers : pièce d'identité + état civil + profession.
-- Entités (Entreprise/Banque/Bailleur/Administration) : représentant légal,
-- utile pour signifier correctement un acte à une personne morale.

CREATE TYPE "{{SCHEMA}}".type_piece_identite AS ENUM (
  'CNIB', 'PASSEPORT', 'CARTE_SEJOUR', 'PERMIS_CONDUIRE', 'AUTRE'
);

ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS type_piece "{{SCHEMA}}".type_piece_identite;
ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS date_naissance DATE;
ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS lieu_naissance TEXT;
ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS nationalite TEXT;
ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS date_delivrance_piece DATE;
ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS date_expiration_piece DATE;
ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS lieu_delivrance_piece TEXT;
ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS representant_nom TEXT;
ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS representant_prenom TEXT;
ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS representant_fonction TEXT;