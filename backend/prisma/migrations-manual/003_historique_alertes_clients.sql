CREATE TABLE IF NOT EXISTS alertes_clients_historique (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  facture_id      UUID REFERENCES factures(id) ON DELETE SET NULL,
  type            TEXT NOT NULL, -- 'ECHEANCE_PROCHE' | 'RETARD'
  montant_restant NUMERIC(14,2),
  envoyee         BOOLEAN NOT NULL DEFAULT TRUE,
  envoyee_le      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alertes_clients_historique_client ON alertes_clients_historique(client_id);
