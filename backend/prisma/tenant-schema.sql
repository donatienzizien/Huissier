-- Gabarit DDL exÃ©cutÃ© pour CHAQUE nouveau cabinet, dans son propre schÃ©ma
-- PostgreSQL (ex: cabinet_sonatel). Le placeholder {{SCHEMA}} est remplacÃ©
-- dynamiquement par TenantProvisioningService avant exÃ©cution.
--
-- Isolation : chaque cabinet a son propre jeu de tables. Aucune requÃªte
-- inter-schÃ©mas n'est possible depuis l'application (le search_path est
-- fixÃ© par requÃªte via le TenantMiddleware).

CREATE SCHEMA IF NOT EXISTS "{{SCHEMA}}";

CREATE TYPE "{{SCHEMA}}".role_utilisateur AS ENUM ('HUISSIER', 'CLERC', 'COMPTABLE', 'SECRETAIRE', 'AGENT_TERRAIN');
CREATE TYPE "{{SCHEMA}}".statut_dossier AS ENUM ('OUVERT', 'EN_COURS', 'CLOTURE', 'ARCHIVE');
CREATE TYPE "{{SCHEMA}}".type_dossier AS ENUM ('RECOUVREMENT', 'EXPULSION', 'SIGNIFICATION', 'SAISIE', 'AUTRE');
CREATE TYPE "{{SCHEMA}}".statut_client AS ENUM ('ACTIF', 'SOLDE', 'INSOLVABLE');
CREATE TYPE "{{SCHEMA}}".categorie_client AS ENUM ('PARTICULIER', 'ENTREPRISE', 'BANQUE', 'BAILLEUR', 'ADMINISTRATION', 'AUTRE');
CREATE TYPE "{{SCHEMA}}".role_tiers AS ENUM ('CLIENT', 'DEBITEUR');
CREATE TYPE "{{SCHEMA}}".type_piece_identite AS ENUM ('CNIB', 'PASSEPORT', 'CARTE_SEJOUR', 'PERMIS_CONDUIRE', 'AUTRE');
CREATE TYPE "{{SCHEMA}}".type_acte AS ENUM ('SIGNIFICATION', 'COMMANDEMENT_PAYER', 'PV_CONSTAT', 'PV_SAISIE', 'SOMMATION', 'MISE_EN_DEMEURE', 'ASSIGNATION', 'CONGE_BAIL', 'SAISIE_ATTRIBUTION', 'SAISIE_VENTE', 'SIGNIFICATION_JUGEMENT', 'LETTRE_MISSION', 'PROCURATION', 'CONVENTION_HONORAIRES', 'ACCUSE_RECEPTION_DOSSIER', 'NANTISSEMENT', 'LEGALISATION', 'AUTRE');
CREATE TYPE "{{SCHEMA}}".niveau_validation AS ENUM ('CLERC', 'HUISSIER');
CREATE TYPE "{{SCHEMA}}".statut_validation_acte AS ENUM ('BROUILLON', 'EN_ATTENTE_VALIDATION', 'VALIDE');
CREATE TYPE "{{SCHEMA}}".statut_facture AS ENUM ('BROUILLON', 'ENVOYEE', 'PARTIELLE', 'PAYEE', 'ANNULEE');
CREATE TYPE "{{SCHEMA}}".mode_paiement AS ENUM ('ESPECES', 'VIREMENT', 'MOBILE_MONEY');

CREATE TABLE "{{SCHEMA}}".utilisateurs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom           TEXT NOT NULL,
  prenom        TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  mot_de_passe  TEXT NOT NULL,
  role          "{{SCHEMA}}".role_utilisateur NOT NULL,
  refresh_token TEXT,
  actif         BOOLEAN NOT NULL DEFAULT TRUE,
  photo_path TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "{{SCHEMA}}".clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         TEXT NOT NULL,
  prenom      TEXT,
  nin         TEXT,
  categorie   "{{SCHEMA}}".categorie_client NOT NULL DEFAULT 'PARTICULIER',
  ifu         TEXT,
  rccm        TEXT,
  telephone   TEXT,
  email       TEXT,
  adresse     TEXT,
  statut      "{{SCHEMA}}".statut_client NOT NULL DEFAULT 'ACTIF',
  mot_de_passe TEXT,
  acces_portail BOOLEAN NOT NULL DEFAULT FALSE,
  type_piece    "{{SCHEMA}}".type_piece_identite,
  date_naissance DATE,
  lieu_naissance TEXT,
  nationalite   TEXT,
  date_delivrance_piece DATE,
  date_expiration_piece DATE,
  lieu_delivrance_piece TEXT,
  profession    TEXT,
  representant_nom TEXT,
  representant_prenom TEXT,
  representant_fonction TEXT,
  role_tiers  "{{SCHEMA}}".role_tiers NOT NULL DEFAULT 'CLIENT',
  logo_path   TEXT,
  whatsapp    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "{{SCHEMA}}".dossiers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero      TEXT NOT NULL UNIQUE, -- gÃ©nÃ©rÃ© automatiquement, ex: DOS-2026-0001
  type        "{{SCHEMA}}".type_dossier NOT NULL,
  statut      "{{SCHEMA}}".statut_dossier NOT NULL DEFAULT 'OUVERT',
  client_id   UUID NOT NULL REFERENCES "{{SCHEMA}}".clients(id) ON DELETE RESTRICT,
  debiteur_id UUID REFERENCES "{{SCHEMA}}".clients(id) ON DELETE RESTRICT,
  assigne_clerc_id UUID REFERENCES "{{SCHEMA}}".utilisateurs(id) ON DELETE SET NULL,
  assigne_agent_id UUID REFERENCES "{{SCHEMA}}".utilisateurs(id) ON DELETE SET NULL,
  cree_par    UUID REFERENCES "{{SCHEMA}}".utilisateurs(id),
  description TEXT,
  date_ouverture TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_cloture   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dossiers_client ON "{{SCHEMA}}".dossiers(client_id);
CREATE INDEX idx_dossiers_statut ON "{{SCHEMA}}".dossiers(statut);

CREATE TABLE "{{SCHEMA}}".dossier_historique (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id  UUID NOT NULL REFERENCES "{{SCHEMA}}".dossiers(id) ON DELETE CASCADE,
  utilisateur_id UUID REFERENCES "{{SCHEMA}}".utilisateurs(id),
  action      TEXT NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "{{SCHEMA}}".actes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero      TEXT NOT NULL UNIQUE, -- numÃ©rotation lÃ©gale automatique
  type        "{{SCHEMA}}".type_acte NOT NULL,
  dossier_id  UUID NOT NULL REFERENCES "{{SCHEMA}}".dossiers(id) ON DELETE RESTRICT,
  contenu     JSONB NOT NULL, -- donnÃ©es de fusion pour le modÃ¨le PDF
  pdf_path    TEXT,
  signe_par   UUID REFERENCES "{{SCHEMA}}".utilisateurs(id),
  date_acte   TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut_validation "{{SCHEMA}}".statut_validation_acte NOT NULL DEFAULT 'BROUILLON',
  corps_html  TEXT,
  soumis_par  UUID REFERENCES "{{SCHEMA}}".utilisateurs(id),
  soumis_le   TIMESTAMPTZ,
  valide_par  UUID REFERENCES "{{SCHEMA}}".utilisateurs(id),
  valide_le   TIMESTAMPTZ,
  rejete_par  UUID REFERENCES "{{SCHEMA}}".utilisateurs(id),
  rejete_le   TIMESTAMPTZ,
  motif_rejet TEXT,
  envoye_client_le TIMESTAMPTZ, -- date d'envoi par email au client (lettres pour signature)
  signe_client_le  TIMESTAMPTZ, -- date Ã  laquelle le retour signÃ© a Ã©tÃ© consignÃ© manuellement
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_actes_dossier ON "{{SCHEMA}}".actes(dossier_id);

CREATE TABLE "{{SCHEMA}}".factures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero        TEXT NOT NULL UNIQUE,
  dossier_id    UUID NOT NULL REFERENCES "{{SCHEMA}}".dossiers(id) ON DELETE RESTRICT,
  montant_total NUMERIC(14,2) NOT NULL,
  montant_paye  NUMERIC(14,2) NOT NULL DEFAULT 0,
  statut        "{{SCHEMA}}".statut_facture NOT NULL DEFAULT 'BROUILLON',
  date_emission TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_echeance TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_factures_dossier ON "{{SCHEMA}}".factures(dossier_id);

CREATE TABLE "{{SCHEMA}}".paiements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id  UUID NOT NULL REFERENCES "{{SCHEMA}}".factures(id) ON DELETE RESTRICT,
  montant     NUMERIC(14,2) NOT NULL,
  mode        "{{SCHEMA}}".mode_paiement NOT NULL,
  reference   TEXT,
  date_paiement TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_paiements_facture ON "{{SCHEMA}}".paiements(facture_id);

CREATE TABLE "{{SCHEMA}}".evenements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre       TEXT NOT NULL,
  description TEXT,
  dossier_id  UUID REFERENCES "{{SCHEMA}}".dossiers(id) ON DELETE SET NULL,
  assigne_a   UUID REFERENCES "{{SCHEMA}}".utilisateurs(id),
  date_debut  TIMESTAMPTZ NOT NULL,
  date_fin    TIMESTAMPTZ,
  rappel_j1   BOOLEAN NOT NULL DEFAULT TRUE,
  rappel_j7   BOOLEAN NOT NULL DEFAULT FALSE,
  rappel_j1_envoye BOOLEAN NOT NULL DEFAULT FALSE,
  rappel_j7_envoye BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_evenements_assigne ON "{{SCHEMA}}".evenements(assigne_a);
CREATE INDEX idx_evenements_dates ON "{{SCHEMA}}".evenements(date_debut);

CREATE TABLE "{{SCHEMA}}".modeles_actes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         TEXT NOT NULL,
  type        "{{SCHEMA}}".type_acte NOT NULL,
  template_html TEXT NOT NULL,
  niveau_validation_requis "{{SCHEMA}}".niveau_validation NOT NULL DEFAULT 'CLERC',
  actif       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ModÃ¨le de dÃ©marrage fourni par dÃ©faut Ã  chaque cabinet (personnalisable
-- ensuite depuis Administration > ModÃ¨les d'actes). Champs de fusion
-- disponibles : numeroActe, dateActe, dossier.*, client.* (voir ActesService).
INSERT INTO "{{SCHEMA}}".modeles_actes (nom, type, template_html) VALUES (
  'Sommation â€” modÃ¨le standard',
  'SOMMATION',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Georgia, serif; font-size: 12pt; color: #1b2c4a; line-height: 1.6; }
    h1 { font-size: 14pt; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
    .ref { text-align: right; font-size: 10pt; color: #555; margin-bottom: 30px; }
    .signature { margin-top: 60px; text-align: right; }
  </style></head><body>
    <div class="ref">Acte nÂ° {{numeroActe}} â€” {{dateActe}}</div>
    <h1>Sommation</h1>
    <p>
      Je soussignÃ©, Huissier de Justice, agissant Ã  la requÃªte de qui de droit,
      ai sommÃ© et somme par les prÃ©sentes :
    </p>
    <p><strong>{{client.nom}} {{client.prenom}}</strong><br>
    {{#if client.adresse}}DomiciliÃ©(e) Ã  {{client.adresse}}<br>{{/if}}
    {{#if client.telephone}}TÃ©lÃ©phone : {{client.telephone}}{{/if}}</p>
    <p>
      Dans le cadre du dossier nÂ° {{dossier.numero}}
      {{#if dossier.description}}({{dossier.description}}){{/if}},
      d''avoir Ã  se conformer aux obligations qui lui incombent, faute de quoi
      il sera procÃ©dÃ© selon les voies de droit.
    </p>
    <div class="signature">L''Huissier de Justice</div>
  </body></html>'
);

-- Compteurs atomiques pour la numÃ©rotation automatique (dossiers, actes...).
-- ClÃ© conventionnelle: '<prefixe>_<annee>', ex: 'dossier_2026'.
CREATE TABLE "{{SCHEMA}}".compteurs (
  cle    TEXT PRIMARY KEY,
  valeur INTEGER NOT NULL DEFAULT 0
);

-- Historique des relances envoyÃ©es Ã  un client/dÃ©biteur (Module 3 du CDC).
-- L'envoi effectif par email est cÃ¢blÃ© au Sprint 4 (Nodemailer) ; la table
-- existe dÃ¨s maintenant pour que le module Clients puisse tracer l'intention.
CREATE TABLE "{{SCHEMA}}".relances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES "{{SCHEMA}}".clients(id) ON DELETE CASCADE,
  envoyee_par UUID REFERENCES "{{SCHEMA}}".utilisateurs(id),
  message     TEXT,
  envoyee_le  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_relances_client ON "{{SCHEMA}}".relances(client_id);



