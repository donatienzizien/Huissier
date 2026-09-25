DO $OUTER$
DECLARE
  schema_rec RECORD;
BEGIN
  FOR schema_rec IN
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog','information_schema','public')
  LOOP

    -- Suppression du modele de test 'Dany'
    EXECUTE format('DELETE FROM %I.modeles_actes WHERE nom = %L', schema_rec.schema_name, 'Dany');

    -- Mise a jour : Sommation de comparaître
    EXECUTE format('UPDATE %I.modeles_actes SET template_html = %L WHERE nom = %L AND type = %L',
      schema_rec.schema_name, '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
  body { font-family: Georgia, ''Times New Roman'', serif; font-size: 12pt; color: #1b2c4a; line-height: 1.7; margin: 40px; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .cabinet-info { font-size: 10pt; }
  .cabinet-info strong { font-size: 12pt; display: block; margin-bottom: 4px; }
  .acte-info { text-align: right; font-size: 10pt; }
  h1 { font-size: 15pt; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 30px 0; border-top: 2px solid #1b2c4a; border-bottom: 2px solid #1b2c4a; padding: 12px 0; }
  .destinataire { margin: 24px 0; font-size: 11pt; }
  .corps p { text-align: justify; margin-bottom: 14px; }
  .signature { margin-top: 50px; text-align: right; }
  table.montants { width: 60%; margin: 20px auto; border-collapse: collapse; }
  table.montants td { padding: 6px 12px; border-bottom: 1px solid #ccc; }
  .montant-total td { font-weight: bold; border-top: 2px solid #1b2c4a; }
  .note-completion { background: #fbf6e9; border: 1px dashed #b08d3e; padding: 8px 12px; font-size: 10pt; margin: 12px 0; }
</style>
</head>
<body>
<div class="entete">
    <div class="cabinet-info">
      <strong>{{cabinet.nom}}</strong>
      Huissier de Justice<br>
      {{cabinet.adresse}}<br>
      Tél. {{cabinet.telephone}} — {{cabinet.email}}
    </div>
    <div class="acte-info">
      Acte n° {{numeroActe}}<br>
      {{dateActe}}<br>
      Dossier n° {{dossier.numero}}
    </div>
  </div>
  <h1>Sommation de comparaître</h1>
  <div class="destinataire">
    À : {{client.nom}} {{client.prenom}}<br>
    {{client.adresse}}
  </div>
  <div class="corps">
    <p>
      L''an {{dateActe}}, à la requête de {{cabinet.nom}}, agissant par le ministère de
      {{signataire.prenom}} {{signataire.nom}}, {{signataire.role}}, j''ai, huissier de justice
      soussigné, sommé et sommons par les présentes :
    </p>
    <p><strong>{{client.nom}} {{client.prenom}}</strong>, demeurant {{client.adresse}},</p>
    <p>
      d''avoir à comparaître dans un délai de {{delaiJours}} jours à compter de la présente
      signification, aux jour, heure et lieu qui lui seront communiqués, afin de s''expliquer sur
      les faits et prétentions relatifs au dossier référencé ci-dessus, à défaut de quoi il sera
      poursuivi selon les voies de droit prévues par l''Acte Uniforme portant Organisation des
      Procédures Simplifiées de Recouvrement et des Voies d''Exécution (AUPSRVE).
    </p>
    <div class="note-completion">
      [À compléter avant envoi : date, heure et lieu précis de comparution]
    </div>
  </div>
  <div class="signature">
    Fait à _______________, le {{dateActe}}<br><br>
    L''Huissier de Justice,<br>
    {{signataire.prenom}} {{signataire.nom}}
  </div>
</body>
</html>
', 'Sommation de comparaître', 'SOMMATION');

    -- Mise a jour : Sommation — modèle standard
    EXECUTE format('UPDATE %I.modeles_actes SET template_html = %L WHERE nom = %L AND type = %L',
      schema_rec.schema_name, '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
  body { font-family: Georgia, ''Times New Roman'', serif; font-size: 12pt; color: #1b2c4a; line-height: 1.7; margin: 40px; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .cabinet-info { font-size: 10pt; }
  .cabinet-info strong { font-size: 12pt; display: block; margin-bottom: 4px; }
  .acte-info { text-align: right; font-size: 10pt; }
  h1 { font-size: 15pt; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 30px 0; border-top: 2px solid #1b2c4a; border-bottom: 2px solid #1b2c4a; padding: 12px 0; }
  .destinataire { margin: 24px 0; font-size: 11pt; }
  .corps p { text-align: justify; margin-bottom: 14px; }
  .signature { margin-top: 50px; text-align: right; }
  table.montants { width: 60%; margin: 20px auto; border-collapse: collapse; }
  table.montants td { padding: 6px 12px; border-bottom: 1px solid #ccc; }
  .montant-total td { font-weight: bold; border-top: 2px solid #1b2c4a; }
  .note-completion { background: #fbf6e9; border: 1px dashed #b08d3e; padding: 8px 12px; font-size: 10pt; margin: 12px 0; }
</style>
</head>
<body>
<div class="entete">
    <div class="cabinet-info">
      <strong>{{cabinet.nom}}</strong>
      Huissier de Justice<br>
      {{cabinet.adresse}}<br>
      Tél. {{cabinet.telephone}} — {{cabinet.email}}
    </div>
    <div class="acte-info">
      Acte n° {{numeroActe}}<br>
      {{dateActe}}<br>
      Dossier n° {{dossier.numero}}
    </div>
  </div>
  <h1>Sommation</h1>
  <div class="destinataire">
    À : {{client.nom}} {{client.prenom}}<br>
    {{client.adresse}}
  </div>
  <div class="corps">
    <p>
      L''an {{dateActe}}, à la requête de {{cabinet.nom}}, agissant par le ministère de
      {{signataire.prenom}} {{signataire.nom}}, {{signataire.role}}, j''ai, huissier de justice
      soussigné, sommé et sommons par les présentes :
    </p>
    <p><strong>{{client.nom}} {{client.prenom}}</strong>, demeurant {{client.adresse}},</p>
    <p>
      d''avoir à se conformer, dans un délai de {{delaiJours}} jours à compter de la présente
      signification, aux obligations lui incombant dans le cadre du dossier référencé
      ci-dessus, faute de quoi il s''expose aux poursuites et voies d''exécution prévues par la
      loi.
    </p>
    {{#if montantDu}}
    <table class="montants">
      <tr><td>Montant dû</td><td>{{montantDu}} FCFA</td></tr>
      <tr><td>Montant déjà payé</td><td>{{montantPaye}} FCFA</td></tr>
      <tr class="montant-total"><td>Solde restant</td><td>{{montantRestant}} FCFA</td></tr>
    </table>
    {{/if}}
  </div>
  <div class="signature">
    Fait à _______________, le {{dateActe}}<br><br>
    L''Huissier de Justice,<br>
    {{signataire.prenom}} {{signataire.nom}}
  </div>
</body>
</html>
', 'Sommation — modèle standard', 'SOMMATION');

    -- Creation : Assignation
    EXECUTE format('INSERT INTO %I.modeles_actes (nom, type, template_html, actif) SELECT %L, %L, %L, TRUE WHERE NOT EXISTS (SELECT 1 FROM %I.modeles_actes WHERE nom = %L)',
      schema_rec.schema_name, 'Assignation', 'ASSIGNATION', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
  body { font-family: Georgia, ''Times New Roman'', serif; font-size: 12pt; color: #1b2c4a; line-height: 1.7; margin: 40px; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .cabinet-info { font-size: 10pt; }
  .cabinet-info strong { font-size: 12pt; display: block; margin-bottom: 4px; }
  .acte-info { text-align: right; font-size: 10pt; }
  h1 { font-size: 15pt; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 30px 0; border-top: 2px solid #1b2c4a; border-bottom: 2px solid #1b2c4a; padding: 12px 0; }
  .destinataire { margin: 24px 0; font-size: 11pt; }
  .corps p { text-align: justify; margin-bottom: 14px; }
  .signature { margin-top: 50px; text-align: right; }
  table.montants { width: 60%; margin: 20px auto; border-collapse: collapse; }
  table.montants td { padding: 6px 12px; border-bottom: 1px solid #ccc; }
  .montant-total td { font-weight: bold; border-top: 2px solid #1b2c4a; }
  .note-completion { background: #fbf6e9; border: 1px dashed #b08d3e; padding: 8px 12px; font-size: 10pt; margin: 12px 0; }
</style>
</head>
<body>
<div class="entete">
    <div class="cabinet-info">
      <strong>{{cabinet.nom}}</strong>
      Huissier de Justice<br>
      {{cabinet.adresse}}<br>
      Tél. {{cabinet.telephone}} — {{cabinet.email}}
    </div>
    <div class="acte-info">
      Acte n° {{numeroActe}}<br>
      {{dateActe}}<br>
      Dossier n° {{dossier.numero}}
    </div>
  </div>
  <h1>Assignation</h1>
  <div class="destinataire">
    À : {{client.nom}} {{client.prenom}}<br>
    {{client.adresse}}
  </div>
  <div class="corps">
    <p>
      L''an {{dateActe}}, à la requête de {{cabinet.nom}}, agissant par le ministère de
      {{signataire.prenom}} {{signataire.nom}}, {{signataire.role}}, j''ai, huissier de justice
      soussigné, donné assignation à :
    </p>
    <p><strong>{{client.nom}} {{client.prenom}}</strong>, demeurant {{client.adresse}},</p>
    <p>
      d''avoir à comparaître devant le Tribunal compétent, aux jour, heure et lieu qui lui seront
      précisés, pour s''entendre statuer sur les demandes formées dans le cadre du dossier
      référencé ci-dessus.
    </p>
    <div class="note-completion">
      [À compléter avant envoi : juridiction saisie, date et heure d''audience, objet précis de la
      demande, articles de loi visés]
    </div>
  </div>
  <div class="signature">
    Fait à _______________, le {{dateActe}}<br><br>
    L''Huissier de Justice,<br>
    {{signataire.prenom}} {{signataire.nom}}
  </div>
</body>
</html>
', schema_rec.schema_name, 'Assignation');

    -- Creation : Congé / résiliation de bail
    EXECUTE format('INSERT INTO %I.modeles_actes (nom, type, template_html, actif) SELECT %L, %L, %L, TRUE WHERE NOT EXISTS (SELECT 1 FROM %I.modeles_actes WHERE nom = %L)',
      schema_rec.schema_name, 'Congé / résiliation de bail', 'CONGE_BAIL', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
  body { font-family: Georgia, ''Times New Roman'', serif; font-size: 12pt; color: #1b2c4a; line-height: 1.7; margin: 40px; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .cabinet-info { font-size: 10pt; }
  .cabinet-info strong { font-size: 12pt; display: block; margin-bottom: 4px; }
  .acte-info { text-align: right; font-size: 10pt; }
  h1 { font-size: 15pt; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 30px 0; border-top: 2px solid #1b2c4a; border-bottom: 2px solid #1b2c4a; padding: 12px 0; }
  .destinataire { margin: 24px 0; font-size: 11pt; }
  .corps p { text-align: justify; margin-bottom: 14px; }
  .signature { margin-top: 50px; text-align: right; }
  table.montants { width: 60%; margin: 20px auto; border-collapse: collapse; }
  table.montants td { padding: 6px 12px; border-bottom: 1px solid #ccc; }
  .montant-total td { font-weight: bold; border-top: 2px solid #1b2c4a; }
  .note-completion { background: #fbf6e9; border: 1px dashed #b08d3e; padding: 8px 12px; font-size: 10pt; margin: 12px 0; }
</style>
</head>
<body>
<div class="entete">
    <div class="cabinet-info">
      <strong>{{cabinet.nom}}</strong>
      Huissier de Justice<br>
      {{cabinet.adresse}}<br>
      Tél. {{cabinet.telephone}} — {{cabinet.email}}
    </div>
    <div class="acte-info">
      Acte n° {{numeroActe}}<br>
      {{dateActe}}<br>
      Dossier n° {{dossier.numero}}
    </div>
  </div>
  <h1>Congé — Résiliation de bail</h1>
  <div class="destinataire">
    À : {{client.nom}} {{client.prenom}}<br>
    {{client.adresse}}
  </div>
  <div class="corps">
    <p>
      L''an {{dateActe}}, à la requête de {{cabinet.nom}}, agissant par le ministère de
      {{signataire.prenom}} {{signataire.nom}}, {{signataire.role}}, j''ai, huissier de justice
      soussigné, signifié congé à :
    </p>
    <p><strong>{{client.nom}} {{client.prenom}}</strong>, demeurant {{client.adresse}},</p>
    <p>
      concernant les locaux qu''il occupe en vertu du bail les liant au bailleur, l''invitant à
      libérer et restituer lesdits locaux dans un délai de {{delaiJours}} jours à compter de la
      présente signification, faute de quoi il s''expose aux poursuites en expulsion prévues par
      la loi.
    </p>
    <div class="note-completion">
      [À compléter avant envoi : adresse exacte des locaux, motif du congé, référence du contrat
      de bail]
    </div>
  </div>
  <div class="signature">
    Fait à _______________, le {{dateActe}}<br><br>
    L''Huissier de Justice,<br>
    {{signataire.prenom}} {{signataire.nom}}
  </div>
</body>
</html>
', schema_rec.schema_name, 'Congé / résiliation de bail');

    -- Creation : Saisie-attribution
    EXECUTE format('INSERT INTO %I.modeles_actes (nom, type, template_html, actif) SELECT %L, %L, %L, TRUE WHERE NOT EXISTS (SELECT 1 FROM %I.modeles_actes WHERE nom = %L)',
      schema_rec.schema_name, 'Saisie-attribution', 'SAISIE_ATTRIBUTION', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
  body { font-family: Georgia, ''Times New Roman'', serif; font-size: 12pt; color: #1b2c4a; line-height: 1.7; margin: 40px; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .cabinet-info { font-size: 10pt; }
  .cabinet-info strong { font-size: 12pt; display: block; margin-bottom: 4px; }
  .acte-info { text-align: right; font-size: 10pt; }
  h1 { font-size: 15pt; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 30px 0; border-top: 2px solid #1b2c4a; border-bottom: 2px solid #1b2c4a; padding: 12px 0; }
  .destinataire { margin: 24px 0; font-size: 11pt; }
  .corps p { text-align: justify; margin-bottom: 14px; }
  .signature { margin-top: 50px; text-align: right; }
  table.montants { width: 60%; margin: 20px auto; border-collapse: collapse; }
  table.montants td { padding: 6px 12px; border-bottom: 1px solid #ccc; }
  .montant-total td { font-weight: bold; border-top: 2px solid #1b2c4a; }
  .note-completion { background: #fbf6e9; border: 1px dashed #b08d3e; padding: 8px 12px; font-size: 10pt; margin: 12px 0; }
</style>
</head>
<body>
<div class="entete">
    <div class="cabinet-info">
      <strong>{{cabinet.nom}}</strong>
      Huissier de Justice<br>
      {{cabinet.adresse}}<br>
      Tél. {{cabinet.telephone}} — {{cabinet.email}}
    </div>
    <div class="acte-info">
      Acte n° {{numeroActe}}<br>
      {{dateActe}}<br>
      Dossier n° {{dossier.numero}}
    </div>
  </div>
  <h1>Procès-verbal de saisie-attribution</h1>
  <div class="destinataire">
    Débiteur saisi : {{client.nom}} {{client.prenom}}<br>
    {{client.adresse}}
  </div>
  <div class="corps">
    <p>
      L''an {{dateActe}}, à la requête de {{cabinet.nom}}, agissant par le ministère de
      {{signataire.prenom}} {{signataire.nom}}, {{signataire.role}}, en vertu d''un titre
      exécutoire, j''ai, huissier de justice soussigné, procédé à la saisie-attribution des
      sommes appartenant à :
    </p>
    <p><strong>{{client.nom}} {{client.prenom}}</strong>, demeurant {{client.adresse}},</p>
    <p>
      entre les mains du tiers saisi désigné ci-après, à concurrence des causes de la saisie,
      conformément aux dispositions de l''Acte Uniforme portant Organisation des Procédures
      Simplifiées de Recouvrement et des Voies d''Exécution (AUPSRVE).
    </p>
    <table class="montants">
      <tr><td>Montant dû (principal)</td><td>{{montantDu}} FCFA</td></tr>
      <tr><td>Montant déjà payé</td><td>{{montantPaye}} FCFA</td></tr>
      <tr class="montant-total"><td>Montant de la saisie</td><td>{{montantRestant}} FCFA</td></tr>
    </table>
    <div class="note-completion">
      [À compléter avant envoi : identité et adresse du tiers saisi, référence du titre exécutoire,
      compte(s) visé(s)]
    </div>
  </div>
  <div class="signature">
    Fait à _______________, le {{dateActe}}<br><br>
    L''Huissier de Justice,<br>
    {{signataire.prenom}} {{signataire.nom}}
  </div>
</body>
</html>
', schema_rec.schema_name, 'Saisie-attribution');

    -- Creation : Saisie-vente
    EXECUTE format('INSERT INTO %I.modeles_actes (nom, type, template_html, actif) SELECT %L, %L, %L, TRUE WHERE NOT EXISTS (SELECT 1 FROM %I.modeles_actes WHERE nom = %L)',
      schema_rec.schema_name, 'Saisie-vente', 'SAISIE_VENTE', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
  body { font-family: Georgia, ''Times New Roman'', serif; font-size: 12pt; color: #1b2c4a; line-height: 1.7; margin: 40px; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .cabinet-info { font-size: 10pt; }
  .cabinet-info strong { font-size: 12pt; display: block; margin-bottom: 4px; }
  .acte-info { text-align: right; font-size: 10pt; }
  h1 { font-size: 15pt; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 30px 0; border-top: 2px solid #1b2c4a; border-bottom: 2px solid #1b2c4a; padding: 12px 0; }
  .destinataire { margin: 24px 0; font-size: 11pt; }
  .corps p { text-align: justify; margin-bottom: 14px; }
  .signature { margin-top: 50px; text-align: right; }
  table.montants { width: 60%; margin: 20px auto; border-collapse: collapse; }
  table.montants td { padding: 6px 12px; border-bottom: 1px solid #ccc; }
  .montant-total td { font-weight: bold; border-top: 2px solid #1b2c4a; }
  .note-completion { background: #fbf6e9; border: 1px dashed #b08d3e; padding: 8px 12px; font-size: 10pt; margin: 12px 0; }
</style>
</head>
<body>
<div class="entete">
    <div class="cabinet-info">
      <strong>{{cabinet.nom}}</strong>
      Huissier de Justice<br>
      {{cabinet.adresse}}<br>
      Tél. {{cabinet.telephone}} — {{cabinet.email}}
    </div>
    <div class="acte-info">
      Acte n° {{numeroActe}}<br>
      {{dateActe}}<br>
      Dossier n° {{dossier.numero}}
    </div>
  </div>
  <h1>Procès-verbal de saisie-vente</h1>
  <div class="destinataire">
    Débiteur saisi : {{client.nom}} {{client.prenom}}<br>
    {{client.adresse}}
  </div>
  <div class="corps">
    <p>
      L''an {{dateActe}}, à la requête de {{cabinet.nom}}, agissant par le ministère de
      {{signataire.prenom}} {{signataire.nom}}, {{signataire.role}}, en vertu d''un titre
      exécutoire, j''ai, huissier de justice soussigné, procédé à la saisie des biens meubles
      corporels appartenant à :
    </p>
    <p><strong>{{client.nom}} {{client.prenom}}</strong>, demeurant {{client.adresse}},</p>
    <p>
      en vue de leur vente forcée, à défaut de règlement dans le délai légal, conformément aux
      dispositions de l''Acte Uniforme portant Organisation des Procédures Simplifiées de
      Recouvrement et des Voies d''Exécution (AUPSRVE).
    </p>
    <table class="montants">
      <tr><td>Montant dû (principal)</td><td>{{montantDu}} FCFA</td></tr>
      <tr><td>Montant déjà payé</td><td>{{montantPaye}} FCFA</td></tr>
      <tr class="montant-total"><td>Solde restant</td><td>{{montantRestant}} FCFA</td></tr>
    </table>
    <div class="note-completion">
      [À compléter avant envoi : inventaire détaillé des biens saisis, lieu de la saisie,
      gardien désigné]
    </div>
  </div>
  <div class="signature">
    Fait à _______________, le {{dateActe}}<br><br>
    L''Huissier de Justice,<br>
    {{signataire.prenom}} {{signataire.nom}}
  </div>
</body>
</html>
', schema_rec.schema_name, 'Saisie-vente');

    -- Creation : Signification de jugement
    EXECUTE format('INSERT INTO %I.modeles_actes (nom, type, template_html, actif) SELECT %L, %L, %L, TRUE WHERE NOT EXISTS (SELECT 1 FROM %I.modeles_actes WHERE nom = %L)',
      schema_rec.schema_name, 'Signification de jugement', 'SIGNIFICATION_JUGEMENT', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
  body { font-family: Georgia, ''Times New Roman'', serif; font-size: 12pt; color: #1b2c4a; line-height: 1.7; margin: 40px; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .cabinet-info { font-size: 10pt; }
  .cabinet-info strong { font-size: 12pt; display: block; margin-bottom: 4px; }
  .acte-info { text-align: right; font-size: 10pt; }
  h1 { font-size: 15pt; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 30px 0; border-top: 2px solid #1b2c4a; border-bottom: 2px solid #1b2c4a; padding: 12px 0; }
  .destinataire { margin: 24px 0; font-size: 11pt; }
  .corps p { text-align: justify; margin-bottom: 14px; }
  .signature { margin-top: 50px; text-align: right; }
  table.montants { width: 60%; margin: 20px auto; border-collapse: collapse; }
  table.montants td { padding: 6px 12px; border-bottom: 1px solid #ccc; }
  .montant-total td { font-weight: bold; border-top: 2px solid #1b2c4a; }
  .note-completion { background: #fbf6e9; border: 1px dashed #b08d3e; padding: 8px 12px; font-size: 10pt; margin: 12px 0; }
</style>
</head>
<body>
<div class="entete">
    <div class="cabinet-info">
      <strong>{{cabinet.nom}}</strong>
      Huissier de Justice<br>
      {{cabinet.adresse}}<br>
      Tél. {{cabinet.telephone}} — {{cabinet.email}}
    </div>
    <div class="acte-info">
      Acte n° {{numeroActe}}<br>
      {{dateActe}}<br>
      Dossier n° {{dossier.numero}}
    </div>
  </div>
  <h1>Signification de jugement</h1>
  <div class="destinataire">
    À : {{client.nom}} {{client.prenom}}<br>
    {{client.adresse}}
  </div>
  <div class="corps">
    <p>
      L''an {{dateActe}}, à la requête de {{cabinet.nom}}, agissant par le ministère de
      {{signataire.prenom}} {{signataire.nom}}, {{signataire.role}}, j''ai, huissier de justice
      soussigné, signifié à :
    </p>
    <p><strong>{{client.nom}} {{client.prenom}}</strong>, demeurant {{client.adresse}},</p>
    <p>
      copie du jugement rendu dans le cadre du dossier référencé ci-dessus, l''informant qu''à
      défaut d''exécution volontaire dans un délai de {{delaiJours}} jours à compter de la
      présente signification, il sera procédé à l''exécution forcée dudit jugement par toutes
      voies de droit.
    </p>
    <div class="note-completion">
      [À compléter avant envoi : juridiction, numéro et date du jugement, dispositif à joindre en
      annexe]
    </div>
  </div>
  <div class="signature">
    Fait à _______________, le {{dateActe}}<br><br>
    L''Huissier de Justice,<br>
    {{signataire.prenom}} {{signataire.nom}}
  </div>
</body>
</html>
', schema_rec.schema_name, 'Signification de jugement');

    RAISE NOTICE 'Modeles mis a jour pour le schema : %', schema_rec.schema_name;
  END LOOP;
END $OUTER$;