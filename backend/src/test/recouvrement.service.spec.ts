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
      service: new RecouvrementService(tenantDb, { genererPdf: jest.fn() } as any),
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
  it('ajoute une relance et trace l historique du dossier', async () => {
    const historique: string[] = [];

    const creanceAvecDossierOuvert: any = {
      ...creanceActive,
      dossier_statut: 'OUVERT',
    };

    const { service } = makeService({
      queryOne: jest.fn().mockResolvedValue(creanceAvecDossierOuvert),
      transaction: jest.fn(async (callback) =>
        callback({
          query: jest.fn(async (sql: string) => {
            if (sql.includes('SELECT id, numero, dossier_id, statut')) {
              return { rows: [creanceActive] };
            }

            if (sql.includes('INSERT INTO relances_creance')) {
              return {
                rows: [
                  {
                    id: 'relance-id',
                    creance_id: 'creance-id',
                    canal: 'TELEPHONE',
                    prochaine_action: 'Rappeler le debiteur',
                    prochaine_action_le: '2026-10-10T09:00:00.000Z',
                  },
                ],
              };
            }

            if (sql.includes('INSERT INTO dossier_historique')) {
              historique.push(sql);
              return { rows: [] };
            }

            return { rows: [] };
          }),
        }),
      ),
    });

    const result = await service.ajouterRelance(
      'creance-id',
      {
        canal: 'TELEPHONE',
        commentaire: 'Promesse de paiement.',
        prochaineAction: 'Rappeler le debiteur',
        prochaineActionLe: '2026-10-10T09:00:00.000Z',
      },
      huissier,
    );

    expect(result.id).toBe('relance-id');
    expect(historique.join(' ')).toContain('RELANCE_CREANCE_AJOUTEE');
  });

  it('refuse une relance sur une creance soldee', async () => {
    const creanceSoldee: any = {
      ...creanceActive,
      statut: 'SOLDEE',
      dossier_statut: 'OUVERT',
    };

    const { service } = makeService({
      queryOne: jest.fn().mockResolvedValue(creanceSoldee),
      transaction: jest.fn(async (callback) =>
        callback({
          query: jest.fn(async (sql: string) => {
            if (sql.includes('SELECT id, numero, dossier_id, statut')) {
              return { rows: [creanceSoldee] };
            }

            return { rows: [] };
          }),
        }),
      ),
    });

    await expect(
      service.ajouterRelance(
        'creance-id',
        { canal: 'EMAIL' },
        huissier,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuse une relance par un clerc non responsable', async () => {
    const creanceAutreClerc: any = {
      ...creanceActive,
      assigne_clerc_id: 'autre-clerc-id',
      dossier_statut: 'OUVERT',
    };

    const { service } = makeService({
      queryOne: jest.fn().mockResolvedValue(creanceAutreClerc),
    });

    await expect(
      service.ajouterRelance(
        'creance-id',
        { canal: 'SMS' },
        clercNonAssigne,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuse une date de prochaine action sans action associee', async () => {
    const creanceAvecDossierOuvert: any = {
      ...creanceActive,
      dossier_statut: 'OUVERT',
    };

    const { service, tenantDb } = makeService({
      queryOne: jest.fn().mockResolvedValue(creanceAvecDossierOuvert),
    });

    await expect(
      service.ajouterRelance(
        'creance-id',
        {
          canal: 'COURRIER',
          prochaineActionLe: '2026-10-10T09:00:00.000Z',
        },
        huissier,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(tenantDb.transaction).not.toHaveBeenCalled();
  });

  it('retourne les relances d une creance accessible', async () => {
    const relances = [
      {
        id: 'relance-id',
        canal: 'WHATSAPP',
      },
    ];

    const { service, tenantDb } = makeService({
      queryOne: jest.fn().mockResolvedValue(creanceActive),
      query: jest.fn().mockResolvedValue(relances),
    });

    const result = await service.findRelances('creance-id', huissier);

    expect(result).toEqual(relances);
    expect(tenantDb.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM relances_creance r'),
      ['creance-id'],
    );
  });
  it('retourne les indicateurs du tableau de bord de recouvrement', async () => {
    const synthese = {
      montant_initial_total: '500000.00',
      montant_encaisse_total: '125000.00',
      solde_restant_total: '375000.00',
      montant_echu: '200000.00',
      nombre_creances_en_cours: '4',
      nombre_creances_echues: '2',
      a_echoir: '175000.00',
      retard_1_30: '100000.00',
      retard_31_60: '50000.00',
      retard_61_90: '25000.00',
      retard_90_plus: '25000.00',
    };

    const prochainesActions = [
      {
        creance_id: 'creance-id',
        creance_numero: 'CRE-2026-0001',
        creance_libelle: 'Dette locative',
        dossier_id: 'dossier-id',
        dossier_numero: 'DOS-2026-0001',
        debiteur_nom: 'Doe',
        debiteur_prenom: 'Jane',
        solde_restant: '100000.00',
        jours_retard: 12,
        prochaine_action: 'Appeler le debiteur',
        prochaine_action_le: '2026-10-06T09:00:00.000Z',
      },
    ];

    const debiteursPrioritaires = [
      {
        debiteur_id: 'debiteur-id',
        debiteur_nom: 'Doe',
        debiteur_prenom: 'Jane',
        nombre_creances: '2',
        solde_restant: '200000.00',
        montant_echu: '150000.00',
      },
    ];

    const { service, tenantDb } = makeService({
      queryOne: jest
        .fn()
        .mockResolvedValueOnce(synthese)
        .mockResolvedValueOnce({ total: '1' }),
      query: jest
        .fn()
        .mockResolvedValueOnce(prochainesActions)
        .mockResolvedValueOnce(debiteursPrioritaires),
    });

    const result = await service.getTableauDeBord(huissier);

    expect(result.synthese).toEqual({
      montantInitialTotal: 500000,
      montantEncaisseTotal: 125000,
      soldeRestantTotal: 375000,
      montantEchu: 200000,
      nombreCreancesEnCours: 4,
      nombreCreancesEchues: 2,
      nombreActionsEchues: 1,
    });

    expect(result.balanceAgee).toEqual({
      aEchoir: 175000,
      retard1a30: 100000,
      retard31a60: 50000,
      retard61a90: 25000,
      retard90Plus: 25000,
    });

    expect(result.prochainesActions).toEqual([
      {
        creanceId: 'creance-id',
        creanceNumero: 'CRE-2026-0001',
        creanceLibelle: 'Dette locative',
        dossierId: 'dossier-id',
        dossierNumero: 'DOS-2026-0001',
        debiteurNom: 'Doe',
        debiteurPrenom: 'Jane',
        soldeRestant: 100000,
        joursRetard: 12,
        prochaineAction: 'Appeler le debiteur',
        prochaineActionLe: '2026-10-06T09:00:00.000Z',
      },
    ]);

    expect(result.debiteursPrioritaires).toEqual([
      {
        debiteurId: 'debiteur-id',
        debiteurNom: 'Doe',
        debiteurPrenom: 'Jane',
        nombreCreances: 2,
        soldeRestant: 200000,
        montantEchu: 150000,
      },
    ]);

    expect(tenantDb.queryOne).toHaveBeenCalledTimes(2);
    expect(tenantDb.query).toHaveBeenCalledTimes(2);
  });

  it('limite le tableau de bord aux dossiers assignes a un agent terrain', async () => {
    const agentTerrain: any = {
      sub: 'agent-id',
      role: 'AGENT_TERRAIN',
      email: 'agent@example.test',
    };

    const { service, tenantDb } = makeService({
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({
          montant_initial_total: '0',
          montant_encaisse_total: '0',
          solde_restant_total: '0',
          montant_echu: '0',
          nombre_creances_en_cours: '0',
          nombre_creances_echues: '0',
          a_echoir: '0',
          retard_1_30: '0',
          retard_31_60: '0',
          retard_61_90: '0',
          retard_90_plus: '0',
        })
        .mockResolvedValueOnce({ total: '0' }),
      query: jest.fn().mockResolvedValue([]),
    });

    await service.getTableauDeBord(agentTerrain);

    const allCalls = [
      ...tenantDb.queryOne.mock.calls,
      ...tenantDb.query.mock.calls,
    ];

    expect(allCalls).toHaveLength(4);

    for (const [, params] of allCalls) {
      expect(params).toEqual(['agent-id']);
    }

    expect(
      allCalls.some(([sql]) => sql.includes('d.assigne_agent_id = $1')),
    ).toBe(true);
  });
});
