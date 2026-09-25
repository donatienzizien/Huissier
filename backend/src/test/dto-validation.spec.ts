import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateClientDto } from '../clients/dto/create-client.dto';
import { CreateDossierDto } from '../dossiers/dto/create-dossier.dto';
import { CreateFactureDto } from '../facturation/dto/create-facture.dto';

describe('Validation des DTO', () => {
  it('CreateClientDto rejette un email invalide', async () => {
    const dto = plainToInstance(CreateClientDto, { nom: 'Traoré', email: 'pas-un-email' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('CreateClientDto accepte un client valide avec le minimum requis', async () => {
    const dto = plainToInstance(CreateClientDto, { nom: 'Traoré' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('CreateDossierDto rejette un type de dossier inconnu', async () => {
    const dto = plainToInstance(CreateDossierDto, {
      type: 'TYPE_INEXISTANT',
      clientId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'type')).toBe(true);
  });

  it('CreateDossierDto rejette un clientId qui n\'est pas un UUID', async () => {
    const dto = plainToInstance(CreateDossierDto, { type: 'RECOUVREMENT', clientId: 'abc' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clientId')).toBe(true);
  });

  it('CreateFactureDto rejette un montant négatif ou nul', async () => {
    const dto = plainToInstance(CreateFactureDto, {
      dossierId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      montantTotal: 0,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'montantTotal')).toBe(true);
  });
});
