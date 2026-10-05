-- Recouvrement Sprint 3: relances manuelles et suivi des prochaines actions.
-- Cette migration est idempotente et doit etre executee dans chaque schema tenant.

CREATE TABLE IF NOT EXISTS relances_creance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creance_id UUID NOT NULL
    REFERENCES creances(id) ON DELETE CASCADE,
  canal TEXT NOT NULL,
  commentaire TEXT,
  prochaine_action TEXT,
  prochaine_action_le TIMESTAMPTZ,
  relance_par UUID
    REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'relances_creance_canal_check'
      AND conrelid = 'relances_creance'::regclass
  ) THEN
    ALTER TABLE relances_creance
      ADD CONSTRAINT relances_creance_canal_check
      CHECK (
        canal IN ('EMAIL', 'TELEPHONE', 'SMS', 'COURRIER', 'WHATSAPP', 'AUTRE')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'relances_creance_prochaine_action_check'
      AND conrelid = 'relances_creance'::regclass
  ) THEN
    ALTER TABLE relances_creance
      ADD CONSTRAINT relances_creance_prochaine_action_check
      CHECK (
        prochaine_action_le IS NULL
        OR prochaine_action IS NOT NULL
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_relances_creance_creance_created_at
  ON relances_creance(creance_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_relances_creance_prochaine_action
  ON relances_creance(prochaine_action_le)
  WHERE prochaine_action_le IS NOT NULL;
