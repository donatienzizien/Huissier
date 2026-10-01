-- Encaissements sur créances
CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".encaissements_creance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creance_id UUID NOT NULL REFERENCES "{{SCHEMA}}".creances(id) ON DELETE RESTRICT,
  montant NUMERIC(14,2) NOT NULL CHECK (montant > 0),
  mode "{{SCHEMA}}".mode_paiement NOT NULL,
  reference TEXT,
  date_paiement TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  encaisse_par UUID REFERENCES "{{SCHEMA}}".utilisateurs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_encaissements_creance
  ON "{{SCHEMA}}".encaissements_creance(creance_id);

CREATE INDEX IF NOT EXISTS idx_encaissements_creance_date
  ON "{{SCHEMA}}".encaissements_creance(date_paiement);