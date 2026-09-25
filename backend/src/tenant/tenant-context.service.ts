import { Injectable, Scope } from '@nestjs/common';

export interface ResolvedCabinet {
  id: string;
  slug: string;
  schemaName: string;
}

// Service à portée REQUEST : contient le cabinet résolu pour la requête
// courante (via sous-domaine ou JWT). Toute la couche métier lit le schéma
// tenant à partir d'ici — jamais codé en dur.
@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private cabinet: ResolvedCabinet | null = null;

  set(cabinet: ResolvedCabinet) {
    this.cabinet = cabinet;
  }

  get(): ResolvedCabinet {
    if (!this.cabinet) {
      throw new Error(
        'TenantContextService: aucun cabinet résolu pour cette requête. ' +
          'Le TenantMiddleware ou le JwtAuthGuard doivent le renseigner avant tout accès aux données tenant.',
      );
    }
    return this.cabinet;
  }

  isSet(): boolean {
    return this.cabinet !== null;
  }
}
