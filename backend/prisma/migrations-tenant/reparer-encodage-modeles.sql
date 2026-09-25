-- Répare la corruption d'encodage dans les noms de modèles d'actes
-- (ex: "CongÃ©" au lieu de "Congé"), par remplacement direct des séquences
-- corrompues connues — pas de conversion d'encodage globale (qui échoue
-- si le texte contient par ailleurs un caractère hors Latin-1, comme €).
-- Ne touche pas template_html : seul le nom affiché dans les menus était
-- concerné.
--
-- Usage : node scripts/apply-tenant-migration.js prisma/migrations-tenant/reparer-encodage-modeles-v2.sql

UPDATE "{{SCHEMA}}".modeles_actes
SET nom = replace(replace(replace(replace(replace(replace(replace(replace(
    nom,
    'Ã©', 'é'), 'Ã¨', 'è'), 'Ã ', 'à'), 'Ã´', 'ô'), 'Ã»', 'û'), 'Ã§', 'ç'), 'Ãª', 'ê'), 'Ã‰', 'É')
WHERE nom LIKE '%Ã%';
