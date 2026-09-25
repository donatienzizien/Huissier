// Régénère le fichier .docx de tous les actes existants dont docx_path est
// renseigné, avec les marges corrigées (header/footer/gutter) et la
// position de <w:sectPr> corrigée. Ne touche pas au PDF ni aux autres
// colonnes. À exécuter une seule fois, depuis le dossier backend/ :
//   npx ts-node scripts/regenerer-docx-existants.ts
//
// Limite connue : si plusieurs modèles partagent le même type d'acte
// (ex. les 4 variantes de Sommation), ce script reprend le premier modèle
// créé pour ce type — pas nécessairement celui utilisé à la génération
// d'origine (l'acte ne conserve pas de référence au modèle exact). Les
// données fusionnées (montants, noms, dates) restent en revanche exactes,
// puisqu'elles sont lues depuis l'acte lui-même.

import 'dotenv/config';
import { Pool } from 'pg';
import { writeFile } from 'fs/promises';
import * as Handlebars from 'handlebars';
// Import "any" volontaire ici : ts-node, exécuté en dehors du programme
// principal Nest, ne reprend pas automatiquement le fichier de types
// personnalisé src/types/html-to-docx.d.ts. require() direct l'évite
// complètement, sans dépendre d'aucune déclaration de types.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const HTMLtoDOCX: (
  html: string,
  header: string | null,
  options: Record<string, unknown>,
) => Promise<Buffer> = require('html-to-docx');
import JSZip = require('jszip');

async function corrigerPositionSectPr(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const docPath = 'word/document.xml';
  const fichier = zip.file(docPath);
  if (!fichier) return buffer;
  const xml = await fichier.async('string');
  const sectPrMatch = xml.match(/<w:sectPr\b[^>]*>[\s\S]*?<\/w:sectPr>|<w:sectPr\b[^>]*\/>/);
  if (!sectPrMatch) return buffer;
  const sectPr = sectPrMatch[0];
  const sansSectPr = xml.replace(sectPr, '');
  const corrige = sansSectPr.replace('</w:body>', `${sectPr}</w:body>`);
  zip.file(docPath, corrige);
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function genererDocx(templateHtml: string, donneesFusion: Record<string, unknown>): Promise<Buffer> {
  const htmlRendu = Handlebars.compile(templateHtml)(donneesFusion);
  const brut = await HTMLtoDOCX(htmlRendu, null, {
    title: String(donneesFusion.numeroActe ?? 'Acte'),
    footer: false,
    pageNumber: false,
    margins: { top: 1000, right: 1000, bottom: 1000, left: 1000, header: 720, footer: 720, gutter: 0 },
  });
  return corrigerPositionSectPr(brut);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL introuvable — vérifie que backend/.env existe et contient bien cette variable.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: schemas } = await pool.query<{ schema_name: string }>(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'cabinet_%'`,
  );

  for (const { schema_name } of schemas) {
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schema_name}"`);
      const { rows: actes } = await client.query<{
        id: string;
        numero: string;
        type: string;
        docx_path: string | null;
        contenu: Record<string, unknown>;
      }>(`SELECT id, numero, type, docx_path, contenu FROM actes WHERE docx_path IS NOT NULL`);

      console.log(`${schema_name} : ${actes.length} acte(s) à régénérer`);

      for (const acte of actes) {
        try {
          const { rows: modeleRows } = await client.query<{ template_html: string }>(
            `SELECT template_html FROM modeles_actes WHERE type = $1 ORDER BY created_at ASC LIMIT 1`,
            [acte.type],
          );
          const templateHtml = modeleRows[0]?.template_html;
          if (!templateHtml) {
            console.warn(`  IGNORE ${acte.numero} : aucun modèle de type ${acte.type} trouvé`);
            continue;
          }
          const nouveauBuffer = await genererDocx(templateHtml, acte.contenu);
          await writeFile(acte.docx_path as string, nouveauBuffer);
          console.log(`  OK ${acte.numero} régénéré`);
        } catch (err) {
          console.error(`  ECHEC ${acte.numero} : ${(err as Error).message}`);
        }
      }
    } finally {
      client.release();
    }
  }

  await pool.end();
  console.log('Terminé.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
