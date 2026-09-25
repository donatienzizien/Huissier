-- Migration Sprint 3 — ajoute le modèle d'acte par défaut aux cabinets
-- provisionnés AVANT cette évolution (nouveaux cabinets : déjà inclus
-- dans tenant-schema.sql).
--
-- Usage: node scripts/apply-tenant-migration.js prisma/migrations-tenant/sprint3-default-modele.sql

INSERT INTO "{{SCHEMA}}".modeles_actes (nom, type, template_html)
SELECT
  'Sommation — modèle standard',
  'SOMMATION',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Georgia, serif; font-size: 12pt; color: #1b2c4a; line-height: 1.6; }
    h1 { font-size: 14pt; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
    .ref { text-align: right; font-size: 10pt; color: #555; margin-bottom: 30px; }
    .signature { margin-top: 60px; text-align: right; }
  </style></head><body>
    <div class="ref">Acte n° {{numeroActe}} — {{dateActe}}</div>
    <h1>Sommation</h1>
    <p>Je soussigné, Huissier de Justice, agissant à la requête de qui de droit, ai sommé et somme par les présentes :</p>
    <p><strong>{{client.nom}} {{client.prenom}}</strong><br>
    {{#if client.adresse}}Domicilié(e) à {{client.adresse}}<br>{{/if}}
    {{#if client.telephone}}Téléphone : {{client.telephone}}{{/if}}</p>
    <p>Dans le cadre du dossier n° {{dossier.numero}} {{#if dossier.description}}({{dossier.description}}){{/if}}, d''avoir à se conformer aux obligations qui lui incombent, faute de quoi il sera procédé selon les voies de droit.</p>
    <div class="signature">L''Huissier de Justice</div>
  </body></html>'
WHERE NOT EXISTS (
  SELECT 1 FROM "{{SCHEMA}}".modeles_actes WHERE nom = 'Sommation — modèle standard'
);
