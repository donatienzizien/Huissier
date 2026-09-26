-- Sprint 1 Recouvrement
-- Table des creances dues par les debiteurs dans les dossiers de recouvrement.
-- Cette migration est volontairement idempotente pour les schemas tenant existants.

CREATE TABLE IF NOT EXISTS creances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL,
  reference TEXT,
  montant_initial NUMERIC(14,2) NOT NULL CHECK (montant_initial > 0),
  statut TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (statut IN ('BROUILLON', 'ACTIVE', 'EN_NEGOCIATION', 'SUSPENDUE', 'SOLDEE', 'ABANDONNEE')),
  date_exigibilite TIMESTAMPTZ,
  observations TEXT,
  cree_par UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  cloturee_par UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  cloturee_le TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creances_dossier ON creances(dossier_id);
CREATE INDEX IF NOT EXISTS idx_creances_statut ON creances(statut);
CREATE INDEX IF NOT EXISTS idx_creances_date_exigibilite ON creances(date_exigibilite);
