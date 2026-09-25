import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RapportsService } from './rapports.service';
import { QueryRapportPeriodeDto } from './dto/query-rapport-periode.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rapports')
export class RapportsController {
  constructor(private readonly rapportsService: RapportsService) {}

  @Get('dashboard')
  dashboard() {
    return this.rapportsService.dashboard();
  }

  @Roles('HUISSIER', 'COMPTABLE')
  @Get('dossiers-par-statut')
  dossiersParStatut() {
    return this.rapportsService.dossiersParStatut();
  }

  @Roles('HUISSIER', 'COMPTABLE')
  @Get('dossiers-par-type')
  dossiersParType() {
    return this.rapportsService.dossiersParType();
  }

  @Roles('HUISSIER', 'COMPTABLE')
  @Get('chiffre-affaires-mensuel')
  chiffreAffairesMensuel(@Query() query: QueryRapportPeriodeDto) {
    return this.rapportsService.chiffreAffairesMensuel(query.dateDebut, query.dateFin);
  }

  @Roles('HUISSIER', 'COMPTABLE')
  @Get('taux-recouvrement')
  tauxRecouvrement() {
    return this.rapportsService.tauxRecouvrement();
  }

  @Roles('HUISSIER', 'COMPTABLE')
  @Get('export/pdf')
  async exportPdf(@Query() query: QueryRapportPeriodeDto, @Res() res: Response) {
    const buffer = await this.rapportsService.genererRapportPdf(query.dateDebut, query.dateFin);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="rapport-${new Date().toISOString().slice(0, 10)}.pdf"`);
    res.send(buffer);
  }

  @Roles('HUISSIER', 'COMPTABLE')
  @Get('export/excel')
  async exportExcel(@Query() query: QueryRapportPeriodeDto, @Res() res: Response) {
    const buffer = await this.rapportsService.genererRapportExcel(query.dateDebut, query.dateFin);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  }
}
