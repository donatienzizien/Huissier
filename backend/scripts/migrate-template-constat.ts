import 'dotenv/config';
import { Pool } from 'pg';

const NOUVEAU_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Georgia, serif; font-size: 12pt; color: #1b2c4a; line-height: 1.6; }
    h1 { font-size: 14pt; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
    .ref { text-align: right; font-size: 10pt; color: #555; margin-bottom: 30px; }
    .section { margin-top: 22px; }
    .section-titre { font-weight: bold; font-size: 10.5pt; text-transform: uppercase; color: #6B6252; margin-bottom: 4px; }
    .observations { white-space: pre-wrap; border: 1px solid #E7E2D6; border-radius: 6px; padding: 12px; min-height: 80px; }
    .signature { margin-top: 60px; text-align: right; }
  </style>
</head>
<body>
  <p class="ref">Acte n° {{numeroActe}} — {{dateActe}}</p>
  <h1>Proces-verbal de constat</h1>

  <p>
    L'an {{dateActe}}, a la requete de :
  </p>
  <p><strong>{{client.nom}} {{client.prenom}}</strong>{{#if client.adresse}}, demeurant a {{client.adresse}}{{/if}}</p>

  <p>
    Je soussigne, {{signataire.nom}} {{signataire.prenom}}, Huissier de Justice, me suis transporte
    {{#if debiteur.adresse}}a l'adresse {{debiteur.adresse}}{{else}}sur les lieux{{/if}}
    dans le cadre du dossier n° {{dossier.numero}}{{#if dossier.description}} ({{dossier.description}}){{/if}},
    afin de proceder aux constatations suivantes :
  </p>

  <div class="section">
    <div class="section-titre">Observations</div>
    <div class="observations">{{#if notes}}{{notes}}{{else}}[Decrire ici les constatations effectuees sur place : etat des lieux, faits observes, heure d'arrivee et de depart, personnes rencontrees, etc.]{{/if}}</div>
  </div>

  {{#if debiteur.nom}}
  <div class="section">
    <div class="section-titre">Personne concernee</div>
    <p>{{debiteur.nom}} {{debiteur.prenom}}{{#if debiteur.telephone}} — Tel : {{debiteur.telephone}}{{/if}}</p>
  </div>
  {{/if}}

  <p style="margin-top: 30px;">
    De tout ce que dessus, j'ai dresse le present proces-verbal de constat pour servir et valoir ce que de droit.
  </p>

  <div class="signature">L'Huissier de Justice<br>{{signataire.nom}} {{signataire.prenom}}</div>
</body>
</html>`;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows: schemas } = await pool.query<{ schema_name: string }>(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'cabinet_%'`,
  );

  for (const { schema_name } of schemas) {
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schema_name}"`);
      const { rows } = await client.query<{ id: string; template_html: string }>(
        `SELECT id, template_html FROM modeles_actes WHERE type = 'PV_CONSTAT' AND nom = 'Constat'`,
      );

      if (rows.length === 0) {
        console.log(`${schema_name} : aucun modele Constat trouve, ignore.`);
        continue;
      }

      for (const modele of rows) {
        if (modele.template_html.includes("Titre de l'acte")) {
          await client.query(`UPDATE modeles_actes SET template_html = $1 WHERE id = $2`, [
            NOUVEAU_TEMPLATE,
            modele.id,
          ]);
          console.log(`${schema_name} : modele Constat (${modele.id}) mis a jour.`);
        } else {
          console.log(`${schema_name} : modele Constat (${modele.id}) deja personnalise, non touche.`);
        }
      }
    } finally {
      client.release();
    }
  }
  await pool.end();
}
main().catch((err) => { console.error(err); process.exit(1); });
