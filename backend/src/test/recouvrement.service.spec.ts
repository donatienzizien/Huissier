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
});
