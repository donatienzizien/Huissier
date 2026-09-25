import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FacturationService } from '../facturation/facturation.service';

function makeTenantDbMock(facture: any, totalPayeApresInsertion: number) {
  return {
    queryOne: jest.fn().mockResolvedValue(facture),
    query: jest.fn(),
    transaction: jest.fn(async (fn: any) => {
      const client = {
        query: jest.fn(async (sql: string, params: any[] = []) => {
          if (sql.startsWith('INSERT INTO paiements')) return { rows: [] };
          if (sql.startsWith('SELECT COALESCE')) {
            return { rows: [{ total: String(totalPayeApresInsertion) }] };
          }
          if (sql.startsWith('UPDATE factures')) {
            const [montantPaye, statut] = params;
            return { rows: [{ ...facture, montant_paye: String(montantPaye), statut }] };
          }
          return { rows: [] };
        }),
      };
      return fn(client);
    }),
  };
}

describe('FacturationService — encaissement de paiements', () => {
  const facture = {
    id: 'f1',
    montant_total: '100000',
    montant_paye: '0',
    statut: 'ENVOYEE',
  };

  it('passe la facture à PARTIELLE si le montant réglé est inférieur au total', async () => {
    const tenantDb = makeTenantDbMock(facture, 40000);
    const service = new FacturationService(tenantDb as any, {} as any, {} as any, {} as any);

    const result = await service.ajouterPaiement('f1', { montant: 40000, mode: 'ESPECES' });

    expect(result.statut).toBe('PARTIELLE');
  });

  it('passe la facture à PAYEE quand le montant réglé atteint le total', async () => {
    const tenantDb = makeTenantDbMock(facture, 100000);
    const service = new FacturationService(tenantDb as any, {} as any, {} as any, {} as any);

    const result = await service.ajouterPaiement('f1', { montant: 100000, mode: 'VIREMENT' });

    expect(result.statut).toBe('PAYEE');
  });

  it('rejette un paiement sur une facture introuvable', async () => {
    const tenantDb = { queryOne: jest.fn().mockResolvedValue(null) };
    const service = new FacturationService(tenantDb as any, {} as any, {} as any, {} as any);

    await expect(
      service.ajouterPaiement('inconnue', { montant: 1000, mode: 'ESPECES' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejette un paiement sur une facture annulée', async () => {
    const tenantDb = {
      queryOne: jest.fn().mockResolvedValue({ ...facture, statut: 'ANNULEE' }),
    };
    const service = new FacturationService(tenantDb as any, {} as any, {} as any, {} as any);

    await expect(
      service.ajouterPaiement('f1', { montant: 1000, mode: 'ESPECES' }),
    ).rejects.toThrow(BadRequestException);
  });
});
