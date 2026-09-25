import { Injectable } from '@nestjs/common';
import { TenantDbService } from '../tenant/tenant-db.service';

export interface Alerte {
  id: string;
  type: 'FACTURE_EN_RETARD' | 'FACTURE_ECHEANCE_PROCHE' | 'ECHEANCE_AGENDA';
  titre: string;
  message: string;
  lien: string;
  date: string;
}

@Injectable()
export class AlertesService {
  constructor(private readonly tenantDb: TenantDbService) {}

  async findAll(): Promise<Alerte[]> {
    const maintenant = new Date();
    const dans7Jours = new Date(maintenant.getTime() + 7 * 24 * 3600 * 1000);
    const dans3Jours = new Date(maintenant.getTime() + 3 * 24 * 3600 * 1000);

    const [factures, evenements] = await Promise.all([
      this.tenantDb.query<{
        id: string;
        numero: string;
        montant_total: string;
        montant_paye: string;
        date_echeance: string;
        client_nom: string;
        client_prenom: string | null;
      }>(
        `SELECT f.id, f.numero, f.montant_total, f.montant_paye, f.date_echeance,
                c.nom AS client_nom, c.prenom AS client_prenom
         FROM factures f
         JOIN dossiers d ON d.id = f.dossier_id
         JOIN clients c ON c.id = d.client_id
         WHERE f.statut IN ('ENVOYEE', 'PARTIELLE')
           AND f.date_echeance IS NOT NULL
           AND f.date_echeance <= $1
         ORDER BY f.date_echeance ASC
         LIMIT 20`,
        [dans7Jours],
      ),
      this.tenantDb.query<{
        id: string;
        titre: string;
        date_debut: string;
        dossier_id: string | null;
        dossier_numero: string | null;
      }>(
        `SELECT e.id, e.titre, e.date_debut, e.dossier_id, d.numero AS dossier_numero
         FROM evenements e
         LEFT JOIN dossiers d ON d.id = e.dossier_id
         WHERE e.date_debut BETWEEN $1 AND $2
         ORDER BY e.date_debut ASC
         LIMIT 20`,
        [maintenant, dans3Jours],
      ),
    ]);

    const alertes: Alerte[] = [];

    for (const f of factures) {
      const enRetard = new Date(f.date_echeance) < maintenant;
      const restant = Number(f.montant_total) - Number(f.montant_paye);
      alertes.push({
        id: `facture-${f.id}`,
        type: enRetard ? 'FACTURE_EN_RETARD' : 'FACTURE_ECHEANCE_PROCHE',
        titre: enRetard ? `Facture ${f.numero} en retard` : `Échéance proche — ${f.numero}`,
        message: `${f.client_nom} ${f.client_prenom ?? ''} — reste ${new Intl.NumberFormat('fr-FR').format(restant)} FCFA`,
        lien: `/facturation/${f.id}`,
        date: f.date_echeance,
      });
    }

    for (const e of evenements) {
      alertes.push({
        id: `evenement-${e.id}`,
        type: 'ECHEANCE_AGENDA',
        titre: e.titre,
        message: e.dossier_numero ? `Dossier ${e.dossier_numero}` : 'Rendez-vous à venir',
        lien: e.dossier_id ? `/dossiers/${e.dossier_id}` : '/agenda',
        date: e.date_debut,
      });
    }

    alertes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return alertes;
  }
}