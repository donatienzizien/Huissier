import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecouvrementService } from '../recouvrement/recouvrement.service';

describe('RecouvrementService', () => {
  function makeService(overrides?: {
    queryOne?: jest.Mock;
    query?: jest.Mock;
    transaction?: jest.Mock;
  }) {
    const tenantDb: any = {
      queryOne: overrides?.queryOne ?? jest.fn(),
      query: overrides?.query ?? jest.fn(),
      transaction:
        overrides?.transaction ??
        jest.fn(async (callback) =>
          callback({
            query: jest.fn(),
          }),
        ),
    };

    return {
      service: new RecouvrementService(tenantDb),
      tenantDb,
    };
  }

  const huissier: any = {
    sub: 'huissier-id',
    role: 'HUISSIER',
    email: 'huissier@example.test',
  };

  const clercNonAssigne: any = {
    sub: 'clerc-id',
    role: 'CLERC',
    email: 'clerc@example.test',
  };

  const creanceActive: any = {
    id: 'creance-id',
    dossier_id: 'dossier-id',
    numero: 'CRE-2026-0001',
    statut: 'ACTIVE',
    montant_initial: '100000.00',
    assigne_clerc_id: null,
    assigne_agent_id: null,
  };

  function makeTransactionalService(
    handler: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>,
  ) {
    const client = {
      query: jest.fn(handler),
    };

    return makeService({
      queryOne: jest.fn().mockResolvedValue(creanceActive),
      query: jest.fn(),
      transaction: jest.fn(async (callback) => callback(client)),
    });
  }

  it('refuse la creation dans un dossier qui nest pas de recouvrement', async () => {
    const { service } = makeService({
      queryOne: jest.fn().mockResolvedValue({
        id: 'dossier-id',
        numero: 'DOS-2026-0001',
        type: 'SAISIE',
        statut: 'OUVERT',
        assigne_clerc_id: null,
        assigne_agent_id: null,
      }),
    });

    await expect(
      service.create(
        {
          dossierId: 'dossier-id',
          libelle: 'Dette locative',
          montantInitial: 150000,
        },
        huissier,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuse la modification par un clerc non responsable', async () => {
    const { service } = makeService({
      queryOne: jest.fn().mockResolvedValue({
        id: 'creance-id',
        dossier_id: 'dossier-id',
        numero: 'CRE-2026-0001',
        statut: 'ACTIVE',
        assigne_clerc_id: 'autre-clerc-id',
        assigne_agent_id: null,
      }),
    });

    await expect(
      service.update('creance-id', { libelle: 'Nouveau libelle' }, clercNonAssigne),
    ).rejects.toThrow(ForbiddenException);
  });

  it('retourne NotFoundException si la creance est inconnue', async () => {
    const { service } = makeService({
      queryOne: jest.fn().mockResolvedValue(null),
    });

    await expect(service.findOne('inconnue', huissier)).rejects.toThrow(NotFoundException);
  });

  it('refuse de réduire le montant initial sous le total encaissé', async () => {
    const { service } = makeTransactionalService(async (sql) => {
      if (sql.includes('SELECT id, montant_initial, statut')) {
        return { rows: [creanceActive] };
      }

      if (sql.includes('SELECT COALESCE(SUM(montant), 0) AS total')) {
        return { rows: [{ total: '60000.00' }] };
      }

      return { rows: [] };
    });

    await expect(
      service.update('creance-id', { montantInitial: 50000 }, huissier),
    ).rejects.toThrow(BadRequestException);
  });

  it('solde la créance lorsque le montant initial devient égal au total encaissé', async () => {
    const historique: string[] = [];

    const { service, tenantDb } = makeTransactionalService(async (sql, params) => {
      if (sql.includes('SELECT id, montant_initial, statut')) {
        return { rows: [creanceActive] };
      }

      if (sql.includes('SELECT COALESCE(SUM(montant), 0) AS total')) {
        return { rows: [{ total: '60000.00' }] };
      }

      if (sql.includes('UPDATE creances')) {
        return {
          rows: [
            {
              ...creanceActive,
              montant_initial: '60000.00',
              statut: 'SOLDEE',
              cloturee_par: huissier.sub,
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO dossier_historique')) {
        historique.push(sql);
        return { rows: [] };
      }

      return { rows: [] };
    });

    const result = await service.update(
      'creance-id',
      { montantInitial: 60000 },
      huissier,
    );

    expect(result.statut).toBe('SOLDEE');
    expect(tenantDb.transaction).toHaveBeenCalledTimes(1);
    expect(historique.join(' ')).toContain(
      'CREANCE_SOLDEE_PAR_AJUSTEMENT_MONTANT',
    );
  });

  it('refuse un encaissement supérieur au solde restant', async () => {
    const { service } = makeTransactionalService(async (sql) => {
      if (sql.includes('SELECT id, numero, dossier_id, montant_initial, statut')) {
        return { rows: [creanceActive] };
      }

      if (sql.includes('SELECT COALESCE(SUM(montant), 0) AS total')) {
        return { rows: [{ total: '80000.00' }] };
      }

      return { rows: [] };
    });

    await expect(
      service.ajouterEncaissement(
        'creance-id',
        { montant: 30000, mode: 'ESPECES' },
        huissier,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('solde automatiquement la créance avec le dernier encaissement', async () => {
    const historique: string[] = [];

    const { service } = makeTransactionalService(async (sql, params) => {
      if (sql.includes('SELECT id, numero, dossier_id, montant_initial, statut')) {
        return { rows: [creanceActive] };
      }

      if (sql.includes('SELECT COALESCE(SUM(montant), 0) AS total')) {
        return { rows: [{ total: '80000.00' }] };
      }

      if (sql.includes('INSERT INTO encaissements_creance')) {
        return {
          rows: [
            {
              id: 'encaissement-id',
              montant: '20000.00',
              mode: 'VIREMENT',
            },
          ],
        };
      }

      if (sql.includes('UPDATE creances')) {
        return {
          rows: [
            {
              ...creanceActive,
              statut: 'SOLDEE',
              cloturee_par: huissier.sub,
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO dossier_historique')) {
        historique.push(sql);
        return { rows: [] };
      }

      return { rows: [] };
    });

    const result = await service.ajouterEncaissement(
      'creance-id',
      { montant: 20000, mode: 'VIREMENT' },
      huissier,
    );

    expect(result.creance.statut).toBe('SOLDEE');
    expect(result.encaissement.id).toBe('encaissement-id');
    expect(historique.join(' ')).toContain('ENCAISSEMENT_ENREGISTRE');
    expect(historique.join(' ')).toContain('CREANCE_SOLDEE_PAR_ENCAISSEMENT');
  });

  it('enregistre un encaissement partiel sans solder la créance', async () => {
    const historique: string[] = [];

    const { service } = makeTransactionalService(async (sql, params) => {
      if (sql.includes('SELECT id, numero, dossier_id, montant_initial, statut')) {
        return { rows: [creanceActive] };
      }

      if (sql.includes('SELECT COALESCE(SUM(montant), 0) AS total')) {
        return { rows: [{ total: '0.00' }] };
      }

      if (sql.includes('INSERT INTO encaissements_creance')) {
        return {
          rows: [
            {
              id: 'encaissement-id',
              montant: '25000.00',
              mode: 'MOBILE_MONEY',
            },
          ],
        };
      }

      if (sql.includes('UPDATE creances')) {
        expect(sql).toContain("WHEN $4::numeric > 0 THEN 'PARTIELLEMENT_ENCAISSEE'");
        expect(params).toEqual([false, huissier.sub, 'creance-id', 25000]);

        return {
          rows: [
            {
              ...creanceActive,
              statut: 'PARTIELLEMENT_ENCAISSEE',
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO dossier_historique')) {
        historique.push(sql);
        return { rows: [] };
      }

      return { rows: [] };
    });

    const result = await service.ajouterEncaissement(
      'creance-id',
      { montant: 25000, mode: 'MOBILE_MONEY' },
      huissier,
    );

    expect(result.creance.statut).toBe('PARTIELLEMENT_ENCAISSEE');
    expect(result.encaissement.id).toBe('encaissement-id');
    expect(historique.join(' ')).toContain('ENCAISSEMENT_ENREGISTRE');
    expect(historique.join(' ')).not.toContain(
      'CREANCE_SOLDEE_PAR_ENCAISSEMENT',
    );
  });
});
