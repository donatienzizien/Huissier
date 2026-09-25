-- Ajoute la capacité de connexion pour les clients du cabinet (portail
-- self-service), séparée du personnel (table utilisateurs). acces_portail
-- reste FALSE tant que le Huissier/Clerc n'a pas explicitement activé
-- l'accès depuis la fiche client.
ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS mot_de_passe TEXT;
ALTER TABLE "{{SCHEMA}}".clients ADD COLUMN IF NOT EXISTS acces_portail BOOLEAN NOT NULL DEFAULT FALSE;