-- Recouvrement Sprint 2: autoriser le statut PARTIELLEMENT_ENCAISSEE.
-- Cette migration est idempotente et doit etre executee dans chaque schema tenant.

ALTER TABLE creances
  DROP CONSTRAINT IF EXISTS creances_statut_check;

ALTER TABLE creances
  ADD CONSTRAINT creances_statut_check
  CHECK (
    statut IN (
      'BROUILLON',
      'ACTIVE',
      'PARTIELLEMENT_ENCAISSEE',
      'EN_NEGOCIATION',
      'SUSPENDUE',
      'SOLDEE',
      'ABANDONNEE'
    )
  );
