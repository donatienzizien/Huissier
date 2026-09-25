-- Ajoute le rôle SECRETAIRE à l'énumération existante (accès limité :
-- agenda complet + consultation des dossiers, sans création/modification
-- ni accès aux actes/facturation — appliqué via les rôles des routes,
-- pas ici).
ALTER TYPE "{{SCHEMA}}".role_utilisateur ADD VALUE IF NOT EXISTS 'SECRETAIRE';