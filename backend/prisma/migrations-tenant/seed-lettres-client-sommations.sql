-- Peuple modeles_actes avec 6 nouveaux modèles de départ :
--   - 4 lettres destinées au CLIENT du dossier, prévues pour signature
--     (mandat de recouvrement, procuration, convention d'honoraires,
--     accusé de réception de dossier) ;
--   - 2 variantes supplémentaires de sommation (à tiers détenteur,
--     de comparaître), sur le même type 'SOMMATION' que les sommations
--     existantes — seul le nom du modèle les distingue, comme c'est déjà
--     le cas pour "Sommation de payer" / "Sommation interpellative".
--
-- À exécuter APRÈS lettres-client-signature.sql (qui ajoute les types
-- LETTRE_MISSION / PROCURATION / CONVENTION_HONORAIRES /
-- ACCUSE_RECEPTION_DOSSIER — transaction séparée, déjà validée).
--
-- Usage : node scripts/apply-tenant-migration.js prisma/migrations-tenant/seed-lettres-client-sommations.sql
--
-- Modèles de DÉPART, à relire et adapter avant usage réel — modifiables
-- à tout moment depuis Administration → Modèles d'actes.

INSERT INTO "{{SCHEMA}}".modeles_actes (nom, type, template_html, actif)
SELECT 'Lettre de mission — mandat de recouvrement', 'LETTRE_MISSION', $tpl$
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 12.5pt; color: #14213D; line-height: 1.65; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #14213D; padding-bottom: 14px; margin-bottom: 34px; }
  .cabinet-nom { font-size: 15pt; font-weight: bold; letter-spacing: 0.3px; }
  .cabinet-coord { font-size: 9.5pt; color: #524A3D; margin-top: 4px; line-height: 1.5; }
  .acte-numero { text-align: right; font-family: 'Courier New', monospace; font-size: 10pt; color: #524A3D; white-space: nowrap; }
  .lieu-date { text-align: right; margin-bottom: 30px; font-size: 11pt; }
  .destinataire { margin-bottom: 28px; }
  .destinataire .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #8C816A; margin-bottom: 3px; }
  .objet { font-weight: bold; margin-bottom: 22px; }
  .objet span { text-decoration: underline; }
  p { text-align: justify; margin: 0 0 14px; }
  .encadre { border: 1px solid #D7D0BE; background: #FAF8F4; padding: 14px 18px; margin: 20px 0; }
  ol { margin: 0 0 16px; padding-left: 20px; }
  ol li { margin-bottom: 6px; text-align: justify; }
  .signatures-doubles { display: flex; justify-content: space-between; gap: 30px; margin-top: 55px; }
  .signature-bloc { flex: 1; }
  .signature-bloc .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #8C816A; margin-bottom: 6px; }
  .signature-bloc .mention { font-size: 9.5pt; color: #8C816A; font-style: italic; margin-bottom: 34px; }
  .signature-bloc .ligne { border-top: 1px solid #14213D; padding-top: 4px; font-size: 9.5pt; }
  .mentions-legales { margin-top: 40px; padding-top: 12px; border-top: 1px solid #D7D0BE; font-size: 8.5pt; color: #8C816A; }
</style>
</head>
<body>
  <div class="entete">
    <div>
      <div class="cabinet-nom">{{cabinet.nom}}</div>
      <div class="cabinet-coord">{{cabinet.adresse}}<br>Tél. {{cabinet.telephone}} — {{cabinet.email}}</div>
    </div>
    <div class="acte-numero">N° {{numeroActe}}<br>Dossier {{dossier.numero}}</div>
  </div>

  <div class="lieu-date">Ouagadougou, le {{dateActe}}</div>

  <div class="destinataire">
    <div class="label">Client / Mandant</div>
    <strong>{{client.nom}} {{client.prenom}}</strong><br>
    {{client.adresse}}
  </div>

  <div class="objet">Objet : <span>Lettre de mission — mandat de recouvrement, dossier {{dossier.numero}}</span></div>

  <p>Madame, Monsieur,</p>

  <p>
    Nous vous remercions de la confiance que vous accordez au cabinet {{cabinet.nom}} et vous
    confirmons par la présente les termes de notre mission concernant le dossier référencé
    ci-dessus{{#if dossier.description}} ({{dossier.description}}){{/if}}.
  </p>

  <div class="encadre">
    Notre mission consiste à assurer, pour votre compte et en votre nom, le recouvrement amiable
    puis, le cas échéant, judiciaire de la créance objet du présent dossier, dans le respect des
    textes en vigueur, notamment l'Acte uniforme OHADA portant organisation des procédures
    simplifiées de recouvrement et des voies d'exécution.
  </div>

  <p>Dans ce cadre, nous sommes autorisés à :</p>
  <ol>
    <li>Adresser toute relance, mise en demeure ou sommation utile au débiteur ;</li>
    <li>Engager, en votre nom, les procédures de recouvrement amiable puis judiciaire nécessaires ;</li>
    <li>Recevoir, pour votre compte, tout règlement effectué par le débiteur dans le cadre du dossier ;</li>
    <li>Vous tenir informé(e) de l'avancement du dossier à chaque étape significative.</li>
  </ol>

  <p>
    Nos honoraires et frais de procédure font l'objet d'une convention distincte, jointe ou déjà
    signée entre nos deux parties.
  </p>

  <p>
    Nous vous saurions gré de bien vouloir nous retourner un exemplaire de la présente, revêtu de la
    mention « Bon pour mandat » et de votre signature, pour valoir accord sur les termes ci-dessus.
  </p>

  {{#if notes}}<p><em>{{notes}}</em></p>{{/if}}

  <div class="signatures-doubles">
    <div class="signature-bloc">
      <div class="label">Le client / mandant</div>
      <div class="mention">Bon pour mandat, précédé de la signature</div>
      <div class="ligne">{{client.nom}} {{client.prenom}}</div>
    </div>
    <div class="signature-bloc">
      <div class="label">Pour le cabinet</div>
      <div class="mention">&nbsp;</div>
      <div class="ligne">{{signataire.prenom}} {{signataire.nom}} — {{signataire.role}}</div>
    </div>
  </div>

  <div class="mentions-legales">
    Cabinet {{cabinet.nom}} — {{cabinet.adresse}} — Document généré le {{dateActe}}, référence {{numeroActe}}.
  </div>
</body>
</html>
$tpl$, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM "{{SCHEMA}}".modeles_actes WHERE nom = 'Lettre de mission — mandat de recouvrement'
);

INSERT INTO "{{SCHEMA}}".modeles_actes (nom, type, template_html, actif)
SELECT 'Procuration', 'PROCURATION', $tpl$
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 12.5pt; color: #14213D; line-height: 1.65; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #14213D; padding-bottom: 14px; margin-bottom: 30px; }
  .cabinet-nom { font-size: 15pt; font-weight: bold; }
  .cabinet-coord { font-size: 9.5pt; color: #524A3D; margin-top: 4px; line-height: 1.5; }
  .acte-numero { text-align: right; font-family: 'Courier New', monospace; font-size: 10pt; color: #524A3D; white-space: nowrap; }
  .titre { text-align: center; font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 26px 0 30px; }
  .partie .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #8C816A; margin-bottom: 3px; }
  .partie { margin-bottom: 20px; }
  p { text-align: justify; margin: 0 0 14px; }
  .encadre { border: 1px solid #D7D0BE; background: #FAF8F4; padding: 14px 18px; margin: 20px 0; }
  .signatures-doubles { display: flex; justify-content: space-between; gap: 30px; margin-top: 55px; }
  .signature-bloc { flex: 1; }
  .signature-bloc .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #8C816A; margin-bottom: 6px; }
  .signature-bloc .mention { font-size: 9.5pt; color: #8C816A; font-style: italic; margin-bottom: 34px; }
  .signature-bloc .ligne { border-top: 1px solid #14213D; padding-top: 4px; font-size: 9.5pt; }
  .mentions-legales { margin-top: 40px; padding-top: 12px; border-top: 1px solid #D7D0BE; font-size: 8.5pt; color: #8C816A; }
</style>
</head>
<body>
  <div class="entete">
    <div>
      <div class="cabinet-nom">{{cabinet.nom}}</div>
      <div class="cabinet-coord">{{cabinet.adresse}}<br>Tél. {{cabinet.telephone}} — {{cabinet.email}}</div>
    </div>
    <div class="acte-numero">N° {{numeroActe}}<br>Dossier {{dossier.numero}}<br>{{dateActe}}</div>
  </div>

  <div class="titre">Procuration</div>

  <div class="partie">
    <div class="label">Le mandant (soussigné)</div>
    <strong>{{client.nom}} {{client.prenom}}</strong><br>
    {{client.adresse}}
  </div>

  <p>
    Je soussigné(e), tel qu'identifié ci-dessus, donne par les présentes pouvoir et procuration au
    <strong>cabinet {{cabinet.nom}}</strong>, représenté par {{signataire.prenom}} {{signataire.nom}}
    ({{signataire.role}}), sis à {{cabinet.adresse}}, à l'effet de me représenter et d'agir en mon
    nom dans le cadre du dossier n° {{dossier.numero}}{{#if dossier.description}}
    ({{dossier.description}}){{/if}}.
  </p>

  <div class="encadre">
    Le mandataire pourra notamment, sans que cette liste soit limitative : accomplir toute démarche
    amiable ou judiciaire utile au recouvrement ou à l'exécution ; recevoir et donner quittance de
    toute somme versée dans le cadre du dossier ; signer tout acte, courrier ou document nécessaire à
    l'accomplissement de sa mission ; représenter le mandant devant toute juridiction ou autorité
    compétente en Burkina Faso, dans les limites prévues par la loi.
  </div>

  <p>
    La présente procuration est consentie pour la durée du dossier susvisé et pourra être révoquée à
    tout moment par notification écrite au cabinet.
  </p>

  {{#if notes}}<p><em>{{notes}}</em></p>{{/if}}

  <div class="signatures-doubles">
    <div class="signature-bloc">
      <div class="label">Le mandant</div>
      <div class="mention">Bon pour pouvoir, précédé de la signature</div>
      <div class="ligne">{{client.nom}} {{client.prenom}}</div>
    </div>
    <div class="signature-bloc">
      <div class="label">Pour acceptation, le cabinet</div>
      <div class="mention">&nbsp;</div>
      <div class="ligne">{{signataire.prenom}} {{signataire.nom}} — {{signataire.role}}</div>
    </div>
  </div>

  <div class="mentions-legales">
    Cabinet {{cabinet.nom}} — {{cabinet.adresse}} — Document généré le {{dateActe}}, référence {{numeroActe}}.
  </div>
</body>
</html>
$tpl$, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM "{{SCHEMA}}".modeles_actes WHERE nom = 'Procuration'
);

INSERT INTO "{{SCHEMA}}".modeles_actes (nom, type, template_html, actif)
SELECT 'Convention d''honoraires', 'CONVENTION_HONORAIRES', $tpl$
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 12.5pt; color: #14213D; line-height: 1.65; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #14213D; padding-bottom: 14px; margin-bottom: 30px; }
  .cabinet-nom { font-size: 15pt; font-weight: bold; }
  .cabinet-coord { font-size: 9.5pt; color: #524A3D; margin-top: 4px; line-height: 1.5; }
  .acte-numero { text-align: right; font-family: 'Courier New', monospace; font-size: 10pt; color: #524A3D; white-space: nowrap; }
  .titre { text-align: center; font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 26px 0 30px; }
  .parties { display: flex; gap: 28px; margin-bottom: 26px; }
  .partie { flex: 1; }
  .partie .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #8C816A; margin-bottom: 3px; }
  p { text-align: justify; margin: 0 0 14px; }
  h3 { font-size: 11.5pt; margin: 22px 0 8px; }
  table.honoraires { width: 100%; border-collapse: collapse; margin: 14px 0 22px; font-size: 11pt; }
  table.honoraires th, table.honoraires td { border: 1px solid #D7D0BE; padding: 8px 12px; text-align: left; }
  table.honoraires th { background: #FAF8F4; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.4px; color: #524A3D; }
  .encadre { border: 1px solid #D7D0BE; background: #FAF8F4; padding: 14px 18px; margin: 20px 0; }
  .signatures-doubles { display: flex; justify-content: space-between; gap: 30px; margin-top: 55px; }
  .signature-bloc { flex: 1; }
  .signature-bloc .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #8C816A; margin-bottom: 6px; }
  .signature-bloc .mention { font-size: 9.5pt; color: #8C816A; font-style: italic; margin-bottom: 34px; }
  .signature-bloc .ligne { border-top: 1px solid #14213D; padding-top: 4px; font-size: 9.5pt; }
  .mentions-legales { margin-top: 40px; padding-top: 12px; border-top: 1px solid #D7D0BE; font-size: 8.5pt; color: #8C816A; }
</style>
</head>
<body>
  <div class="entete">
    <div>
      <div class="cabinet-nom">{{cabinet.nom}}</div>
      <div class="cabinet-coord">{{cabinet.adresse}}<br>Tél. {{cabinet.telephone}} — {{cabinet.email}}</div>
    </div>
    <div class="acte-numero">N° {{numeroActe}}<br>Dossier {{dossier.numero}}<br>{{dateActe}}</div>
  </div>

  <div class="titre">Convention d'honoraires</div>

  <div class="parties">
    <div class="partie">
      <div class="label">Le cabinet</div>
      <strong>{{cabinet.nom}}</strong><br>{{cabinet.adresse}}
    </div>
    <div class="partie">
      <div class="label">Le client</div>
      <strong>{{client.nom}} {{client.prenom}}</strong><br>{{client.adresse}}
    </div>
  </div>

  <p>
    La présente convention a pour objet de fixer les conditions de rémunération du cabinet
    {{cabinet.nom}} pour sa mission dans le dossier n° {{dossier.numero}}{{#if dossier.description}}
    ({{dossier.description}}){{/if}}, conformément au mandat confié par le client.
  </p>

  <h3>Objet et étendue de la mission</h3>
  <p>
    Le cabinet assure, pour le compte du client, les diligences amiables puis, si nécessaire,
    judiciaires nécessaires au traitement du dossier susvisé, incluant la rédaction et la
    signification des actes utiles ainsi que le suivi de la procédure jusqu'à son terme.
  </p>

  <h3>Honoraires et frais</h3>
  <table class="honoraires">
    <tr><th>Poste</th><th>Base</th><th>Montant / Taux</th></tr>
    <tr><td>Honoraires de diligence</td><td>Forfait par acte</td><td>À compléter</td></tr>
    <tr><td>Honoraires de résultat</td><td>Sur sommes recouvrées</td><td>À compléter (%)</td></tr>
    <tr><td>Frais de procédure et débours</td><td>Sur justificatifs</td><td>Remboursables</td></tr>
  </table>

  <div class="encadre">
    Montant de référence de la créance objet du dossier à ce jour : <strong>{{montantDu}} FCFA</strong>
    (déjà réglé : {{montantPaye}} FCFA — restant dû : {{montantRestant}} FCFA). Les montants
    d'honoraires ci-dessus sont à préciser avant signature, conformément à l'accord conclu entre les
    parties.
  </div>

  <p>
    Les honoraires sont exigibles selon les modalités convenues entre les parties, indépendamment de
    l'issue de la procédure, sauf stipulation contraire ci-dessus.
  </p>

  {{#if notes}}<p><em>{{notes}}</em></p>{{/if}}

  <div class="signatures-doubles">
    <div class="signature-bloc">
      <div class="label">Le client</div>
      <div class="mention">Bon pour accord, précédé de la signature</div>
      <div class="ligne">{{client.nom}} {{client.prenom}}</div>
    </div>
    <div class="signature-bloc">
      <div class="label">Pour le cabinet</div>
      <div class="mention">&nbsp;</div>
      <div class="ligne">{{signataire.prenom}} {{signataire.nom}} — {{signataire.role}}</div>
    </div>
  </div>

  <div class="mentions-legales">
    Cabinet {{cabinet.nom}} — {{cabinet.adresse}} — Document généré le {{dateActe}}, référence {{numeroActe}}.
  </div>
</body>
</html>
$tpl$, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM "{{SCHEMA}}".modeles_actes WHERE nom = 'Convention d''honoraires'
);

INSERT INTO "{{SCHEMA}}".modeles_actes (nom, type, template_html, actif)
SELECT 'Accusé de réception de dossier', 'ACCUSE_RECEPTION_DOSSIER', $tpl$
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 12.5pt; color: #14213D; line-height: 1.65; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #14213D; padding-bottom: 14px; margin-bottom: 34px; }
  .cabinet-nom { font-size: 15pt; font-weight: bold; letter-spacing: 0.3px; }
  .cabinet-coord { font-size: 9.5pt; color: #524A3D; margin-top: 4px; line-height: 1.5; }
  .acte-numero { text-align: right; font-family: 'Courier New', monospace; font-size: 10pt; color: #524A3D; white-space: nowrap; }
  .lieu-date { text-align: right; margin-bottom: 30px; font-size: 11pt; }
  .destinataire { margin-bottom: 28px; }
  .destinataire .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #8C816A; margin-bottom: 3px; }
  .objet { font-weight: bold; margin-bottom: 22px; }
  .objet span { text-decoration: underline; }
  p { text-align: justify; margin: 0 0 14px; }
  .encadre { border: 1px solid #D7D0BE; background: #FAF8F4; padding: 14px 18px; margin: 20px 0; }
  .encadre dt { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.4px; color: #8C816A; }
  .encadre dd { margin: 0 0 10px; font-weight: bold; }
  .signature { margin-top: 50px; text-align: right; }
  .signature .role { font-size: 9.5pt; color: #524A3D; margin-top: 2px; }
  .mentions-legales { margin-top: 40px; padding-top: 12px; border-top: 1px solid #D7D0BE; font-size: 8.5pt; color: #8C816A; }
</style>
</head>
<body>
  <div class="entete">
    <div>
      <div class="cabinet-nom">{{cabinet.nom}}</div>
      <div class="cabinet-coord">{{cabinet.adresse}}<br>Tél. {{cabinet.telephone}} — {{cabinet.email}}</div>
    </div>
    <div class="acte-numero">N° {{numeroActe}}<br>Dossier {{dossier.numero}}</div>
  </div>

  <div class="lieu-date">Ouagadougou, le {{dateActe}}</div>

  <div class="destinataire">
    <div class="label">Destinataire</div>
    <strong>{{client.nom}} {{client.prenom}}</strong><br>
    {{client.adresse}}
  </div>

  <div class="objet">Objet : <span>Accusé de réception de votre dossier n° {{dossier.numero}}</span></div>

  <p>Madame, Monsieur,</p>

  <p>
    Nous accusons réception de votre dossier et vous confirmons son ouverture au sein de notre
    cabinet sous les références suivantes :
  </p>

  <div class="encadre">
    <dl>
      <dt>Numéro de dossier</dt><dd>{{dossier.numero}}</dd>
      <dt>Type de dossier</dt><dd>{{dossier.type}}</dd>
      {{#if dossier.description}}<dt>Objet</dt><dd>{{dossier.description}}</dd>{{/if}}
      <dt>Date d'ouverture</dt><dd>{{dateActe}}</dd>
    </dl>
  </div>

  <p>
    Votre dossier va faire l'objet d'un traitement diligent conformément aux termes de notre mission.
    Nous ne manquerons pas de revenir vers vous à chaque étape significative de son évolution.
  </p>

  <p>
    Pour toute question relative à ce dossier, vous pouvez nous contacter en rappelant systématiquement
    la référence {{dossier.numero}}.
  </p>

  {{#if notes}}<p><em>{{notes}}</em></p>{{/if}}

  <p>Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.</p>

  <div class="signature">
    Pour le cabinet,<br>
    <strong>{{signataire.prenom}} {{signataire.nom}}</strong>
    <div class="role">{{signataire.role}}</div>
  </div>

  <div class="mentions-legales">
    Cabinet {{cabinet.nom}} — {{cabinet.adresse}} — Document généré le {{dateActe}}, référence {{numeroActe}}.
  </div>
</body>
</html>
$tpl$, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM "{{SCHEMA}}".modeles_actes WHERE nom = 'Accusé de réception de dossier'
);

INSERT INTO "{{SCHEMA}}".modeles_actes (nom, type, template_html, actif)
SELECT 'Sommation à tiers détenteur', 'SOMMATION', $tpl$
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 12.5pt; color: #14213D; line-height: 1.65; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #14213D; padding-bottom: 14px; margin-bottom: 30px; }
  .cabinet-nom { font-size: 15pt; font-weight: bold; }
  .cabinet-coord { font-size: 9.5pt; color: #524A3D; margin-top: 4px; line-height: 1.5; }
  .acte-numero { text-align: right; font-family: 'Courier New', monospace; font-size: 10pt; color: #524A3D; white-space: nowrap; }
  .titre { text-align: center; font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 26px 0 6px; }
  .fondement { text-align: center; font-size: 9.5pt; color: #8C816A; margin-bottom: 30px; }
  .parties { display: flex; gap: 28px; margin-bottom: 24px; }
  .partie { flex: 1; }
  .partie .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #8C816A; margin-bottom: 3px; }
  p { text-align: justify; margin: 0 0 14px; }
  .montant-bloc { margin: 24px 0; padding: 18px 20px; border: 2px solid #14213D; text-align: center; }
  .montant-bloc .chiffre { font-size: 20pt; font-weight: bold; font-family: 'Courier New', monospace; }
  .avertissement { margin: 20px 0; padding: 14px 18px; background: #FBEEEE; border-left: 3px solid #A93636; font-size: 11.5pt; }
  .signature { margin-top: 50px; text-align: right; }
  .signature .role { font-size: 9.5pt; color: #524A3D; margin-top: 2px; }
  .mentions-legales { margin-top: 40px; padding-top: 12px; border-top: 1px solid #D7D0BE; font-size: 8.5pt; color: #8C816A; }
</style>
</head>
<body>
  <div class="entete">
    <div>
      <div class="cabinet-nom">{{cabinet.nom}}</div>
      <div class="cabinet-coord">{{cabinet.adresse}}<br>Tél. {{cabinet.telephone}} — {{cabinet.email}}</div>
    </div>
    <div class="acte-numero">N° {{numeroActe}}<br>Dossier {{dossier.numero}}<br>{{dateActe}}</div>
  </div>

  <div class="titre">Sommation à tiers détenteur</div>
  <div class="fondement">
    Établie en application des dispositions de l'Acte uniforme OHADA portant organisation des
    procédures simplifiées de recouvrement et des voies d'exécution relatives à la saisie-attribution
  </div>

  <div class="parties">
    <div class="partie">
      <div class="label">À la requête de</div>
      Notre client, représenté par le cabinet {{cabinet.nom}}, dossier {{dossier.numero}}
    </div>
    <div class="partie">
      <div class="label">Tiers détenteur sommé</div>
      <strong>{{client.nom}} {{client.prenom}}</strong><br>
      {{client.adresse}}
    </div>
  </div>

  <p>
    Je soussigné(e), {{signataire.prenom}} {{signataire.nom}}, {{signataire.role}} du cabinet
    {{cabinet.nom}}, agissant à la requête de notre client dans le cadre du dossier susvisé, ai
    sommé et somme par les présentes le tiers détenteur ci-dessus désigné, détenteur de sommes,
    valeurs ou biens appartenant ou dus au débiteur concerné par ce dossier, d'avoir à :
  </p>

  <div class="montant-bloc">
    <div class="chiffre">{{montantRestant}} FCFA</div>
    <div style="font-size: 10pt; color: #524A3D; margin-top: 6px;">
      Montant à concurrence duquel les sommes détenues doivent être bloquées — dossier {{dossier.numero}}
    </div>
  </div>

  <p>
    Déclarer immédiatement l'étendue de ses obligations envers le débiteur ainsi que les modalités
    qui pourraient les affecter, et consigner entre les mains du cabinet {{cabinet.nom}}, dans le
    délai légal de <strong>{{delaiJours}} jours</strong>, les sommes détenues à concurrence du
    montant ci-dessus.
  </p>

  <div class="avertissement">
    À défaut de déclaration ou de consignation dans le délai imparti, le tiers détenteur pourra être
    déclaré débiteur pur et simple des causes de la saisie, conformément aux dispositions de
    l'AUPSRVE.
  </div>

  {{#if notes}}<p><em>{{notes}}</em></p>{{/if}}

  <div class="signature">
    <strong>{{signataire.prenom}} {{signataire.nom}}</strong>
    <div class="role">{{signataire.role}} — {{cabinet.nom}}</div>
  </div>

  <div class="mentions-legales">
    Acte n° {{numeroActe}} — dossier {{dossier.numero}} — {{cabinet.nom}}, {{cabinet.adresse}}.
    Modèle de départ à faire relire au regard des mentions obligatoires AUPSRVE en vigueur.
  </div>
</body>
</html>
$tpl$, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM "{{SCHEMA}}".modeles_actes WHERE nom = 'Sommation à tiers détenteur'
);

INSERT INTO "{{SCHEMA}}".modeles_actes (nom, type, template_html, actif)
SELECT 'Sommation de comparaître', 'SOMMATION', $tpl$
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 12.5pt; color: #14213D; line-height: 1.65; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #14213D; padding-bottom: 14px; margin-bottom: 30px; }
  .cabinet-nom { font-size: 15pt; font-weight: bold; }
  .cabinet-coord { font-size: 9.5pt; color: #524A3D; margin-top: 4px; line-height: 1.5; }
  .acte-numero { text-align: right; font-family: 'Courier New', monospace; font-size: 10pt; color: #524A3D; white-space: nowrap; }
  .titre { text-align: center; font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 26px 0 30px; }
  .partie .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #8C816A; margin-bottom: 3px; }
  .partie { margin-bottom: 18px; }
  p { text-align: justify; margin: 0 0 14px; }
  .rendez-vous { margin: 24px 0; padding: 18px 20px; border: 2px solid #14213D; text-align: center; }
  .rendez-vous .champ { font-size: 13pt; font-weight: bold; }
  .avertissement { margin: 20px 0; padding: 14px 18px; background: #FBEEEE; border-left: 3px solid #A93636; font-size: 11.5pt; }
  .signature { margin-top: 50px; text-align: right; }
  .signature .role { font-size: 9.5pt; color: #524A3D; margin-top: 2px; }
  .mentions-legales { margin-top: 40px; padding-top: 12px; border-top: 1px solid #D7D0BE; font-size: 8.5pt; color: #8C816A; }
</style>
</head>
<body>
  <div class="entete">
    <div>
      <div class="cabinet-nom">{{cabinet.nom}}</div>
      <div class="cabinet-coord">{{cabinet.adresse}}<br>Tél. {{cabinet.telephone}} — {{cabinet.email}}</div>
    </div>
    <div class="acte-numero">N° {{numeroActe}}<br>Dossier {{dossier.numero}}<br>{{dateActe}}</div>
  </div>

  <div class="titre">Sommation de comparaître</div>

  <div class="partie">
    <div class="label">Sommé de comparaître</div>
    <strong>{{client.nom}} {{client.prenom}}</strong><br>
    {{client.adresse}}
  </div>

  <p>
    Je soussigné(e), {{signataire.prenom}} {{signataire.nom}}, {{signataire.role}} du cabinet
    {{cabinet.nom}}, agissant dans le cadre du dossier n° {{dossier.numero}}{{#if dossier.description}}
    ({{dossier.description}}){{/if}}, ai sommé et somme par les présentes la personne susnommée
    d'avoir à comparaître :
  </p>

  <div class="rendez-vous">
    <div class="champ">Au cabinet {{cabinet.nom}}</div>
    <div style="margin-top: 6px;">{{cabinet.adresse}}</div>
    <div style="margin-top: 10px; font-size: 11pt; color: #524A3D;">
      Dans un délai de <strong>{{delaiJours}} jours</strong> à compter de la présente sommation, aux
      jours et heures ouvrables, sauf convocation à date fixe communiquée séparément.
    </div>
  </div>

  <p>
    Cette comparution a pour objet de permettre au sommé de s'expliquer et, le cas échéant, de
    régulariser sa situation à l'amiable dans le dossier susvisé, avant toute poursuite des voies de
    droit.
  </p>

  <div class="avertissement">
    Faute de comparaître dans le délai imparti, il sera passé outre et il sera procédé, sans autre
    avis, selon les voies de droit applicables, notamment par la poursuite des procédures judiciaires
    de recouvrement.
  </div>

  {{#if notes}}<p><em>{{notes}}</em></p>{{/if}}

  <div class="signature">
    <strong>{{signataire.prenom}} {{signataire.nom}}</strong>
    <div class="role">{{signataire.role}} — {{cabinet.nom}}</div>
  </div>

  <div class="mentions-legales">
    Acte n° {{numeroActe}} — dossier {{dossier.numero}} — {{cabinet.nom}}, {{cabinet.adresse}}.
    Modèle de départ à faire relire au regard des mentions obligatoires AUPSRVE en vigueur.
  </div>
</body>
</html>
$tpl$, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM "{{SCHEMA}}".modeles_actes WHERE nom = 'Sommation de comparaître'
);
