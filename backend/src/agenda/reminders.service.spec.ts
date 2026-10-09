import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../notifications/mail.service';
import { RemindersService } from './reminders.service';

describe('RemindersService', () => {
  let service: RemindersService;
  let mailService: { envoyer: jest.Mock };
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(async () => {
    mailService = { envoyer: jest.fn().mockResolvedValue(false) };
    client = {
      query: jest.fn(),
      release: jest.fn(),
    };

    jest.spyOn(Pool.prototype, 'connect').mockImplementation(() => Promise.resolve(client as any));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        {
          provide: PrismaService,
          useValue: {
            cabinet: {
              findMany: jest.fn().mockResolvedValue([
                {
                  slug: 'test',
                  schemaName: 'cabinet_test',
                  nom: 'Cabinet test',
                },
              ]),
            },
          },
        },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(RemindersService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ne marque pas le rappel envoyé si le mail échoue', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // SET LOCAL
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'event-1',
            titre: 'Audience',
            date_debut: '2026-10-10T09:00:00.000Z',
            assigne_email: 'clerc@example.com',
            assigne_nom: 'Clerc',
          },
        ],
      }) // sélection J-1
      .mockResolvedValueOnce({ rows: [] }) // sélection J-7
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    await service.envoyerRappelsQuotidiens();

    expect(mailService.envoyer).toHaveBeenCalledTimes(1);
    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE evenements'),
      expect.anything(),
    );
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });
});
