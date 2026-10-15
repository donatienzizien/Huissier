-- Mettre a jour toutes les creances sans date d'exigibilite
-- avec la date du jour a 00:00:00

UPDATE creances
SET date_exigibilite = DATE_TRUNC('day', NOW())
WHERE date_exigibilite IS NULL;

-- Verifier le nombre de lignes mises a jour
SELECT COUNT(*) AS creances_mises_a_jour
FROM creances
WHERE date_exigibilite = DATE_TRUNC('day', NOW());

-- Verifier qu'il ne reste aucune creance sans date
SELECT COUNT(*) AS creances_sans_date
FROM creances
WHERE date_exigibilite IS NULL;
