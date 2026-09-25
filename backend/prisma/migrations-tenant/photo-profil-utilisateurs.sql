-- Ajoute la colonne de photo de profil pour le personnel (module Avatars),
-- absente jusqu'ici de la structure de la table utilisateurs.
ALTER TABLE "{{SCHEMA}}".utilisateurs ADD COLUMN IF NOT EXISTS photo_path TEXT;