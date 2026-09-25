import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDbService } from '../tenant/tenant-db.service';
import { ActesService } from '../actes/actes.service';
import { FacturationService } from '../facturation/facturation.service';

@Injectable()
export class PortailClientService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly actesService: ActesService,
    private readonly facturationService: FacturationService,
  ) {}

  async moi(clientId: string) {
    const client = await this.tenantDb.queryOne(
      `SELECT id, nom, prenom, email, telephone, adresse FROM clients WHERE id = $1`,
      [clientId],
    );
    if (!client) throw new NotFoundException();
    return client;
  }

  async mesDossiers(clientId: string) {
    return this.tenantDb.query(
      `SELECT id, numero, type, statut, description, date_ouverture
       FROM dossiers WHERE client_id = $1 ORDER BY date_ouverture DESC`,
      [clientId],
    );
  }

  // Vérifie que le dossier appartient bien au client connecté — condition
  // indispensable avant TOUT accès (dossier, acte, facture) sur ce module.
  private async verifierProprietaireDossier(dossierId: string, clientId: string) {
    const dossier = await this.tenantDb.queryOne<{ id: string; client_id: string }>(
      `SELECT id, client_id FROM dossiers WHERE id = $1`,
      [dossierId],
    );
    if (!dossier || dossier.client_id !== clientId) {
      throw new NotFoundException('Dossier introuvable.');
    }
    return dossier;
  }

  async unDossier(dossierId: string, clientId: string) {
    await this.verifierProprietaireDossier(dossierId, clientId);
    const dossier = await this.tenantDb.queryOne(`SELECT * FROM dossiers WHERE id = $1`, [dossierId]);
    const [actes, factures] = await Promise.all([
      this.tenantDb.query(
        `SELECT id, numero, type, date_acte FROM actes WHERE dossier_id = $1 ORDER BY date_acte DESC`,
        [dossierId],
      ),
      this.tenantDb.query(
        `SELECT id, numero, montant_total, montant_paye, statut, date_emission FROM factures
         WHERE dossier_id = $1 ORDER BY date_emission DESC`,
        [dossierId],
      ),
    ]);
    return { ...dossier, actes, factures };
  }

  async mesFactures(clientId: string) {
    return this.tenantDb.query(
      `SELECT f.id, f.numero, f.montant_total, f.montant_paye, f.statut, f.date_emission, d.numero AS dossier_numero
       FROM factures f
       JOIN dossiers d ON d.id = f.dossier_id
       WHERE d.client_id = $1
       ORDER BY f.date_emission DESC`,
      [clientId],
    );
  }

  async acteUnPdf(acteId: string, clientId: string) {
    const acte = await this.tenantDb.queryOne<{ dossier_id: string }>(
      `SELECT dossier_id FROM actes WHERE id = $1`,
      [acteId],
    );
    if (!acte) throw new NotFoundException('Acte introuvable.');
    await this.verifierProprietaireDossier(acte.dossier_id, clientId);
    return this.actesService.getPdfBuffer(acteId);
  }

  async factureUnPdf(factureId: string, clientId: string) {
    const facture = await this.tenantDb.queryOne<{ dossier_id: string }>(
      `SELECT dossier_id FROM factures WHERE id = $1`,
      [factureId],
    );
    if (!facture) throw new NotFoundException('Facture introuvable.');
    await this.verifierProprietaireDossier(facture.dossier_id, clientId);
    return this.facturationService.getPdfBuffer(factureId);
  }
}