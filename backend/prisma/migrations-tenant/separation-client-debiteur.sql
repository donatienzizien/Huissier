-- Sépare le Client (donneur d'ordre, qui mandate et paie le cabinet) du
-- Débiteur (personne poursuivie dans le dossier) — jusqu'ici confondus
-- dans une seule relation dossiers.client_id. Un dossier peut désormais
-- avoir les deux, sur la même table "clients" (les deux rôles partagent
-- les mêmes champs : identité, coordonnées, pièce, représentant légal).
--
-- Rétrocompatibilité : les dossiers déjà créés gardent leur client_id
-- actuel tel quel (rôle "Client") et n'ont pas de débiteur_id — à
-- compléter manuellement si besoin, pas de déduction automatique risquée.

CREATE TYPE "{{SCHEMA}}".role_tiers AS ENUM ('CLIENT', 'DEBITEUR');

ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS role_tiers "{{SCHEMA}}".role_tiers NOT NULL DEFAULT 'CLIENT';
ALTER TABLE "{{SCHEMA}}".dossiers ADD COLUMN IF NOT EXISTS debiteur_id UUID REFERENCES "{{SCHEMA}}".clients(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_dossiers_debiteur ON "{{SCHEMA}}".dossiers(debiteur_id);