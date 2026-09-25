import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FacturationService } from './facturation.service';
import { CreateFactureDto } from './dto/create-facture.dto';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { QueryFacturesDto } from './dto/query-factures.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('factures')
export class FacturationController {
  constructor(private readonly facturationService: FacturationService) {}

  @Get()
  findAll(@Query() query: QueryFacturesDto) {
    return this.facturationService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.facturationService.findOne(id);
  }

  @Roles('HUISSIER', 'COMPTABLE')
  @Post()
  create(@Body() dto: CreateFactureDto) {
    return this.facturationService.create(dto);
  }

  @Roles('HUISSIER', 'COMPTABLE')
  @Post(':id/paiements')
  ajouterPaiement(@Param('id') id: string, @Body() dto: CreatePaiementDto) {
    return this.facturationService.ajouterPaiement(id, dto);
  }

  @Roles('HUISSIER', 'COMPTABLE')
  @Patch(':id/annuler')
  annuler(@Param('id') id: string) {
    return this.facturationService.annuler(id);
  }

  @Get(':id/pdf')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { buffer, numero } = await this.facturationService.getPdfBuffer(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${numero}.pdf"`);
    res.send(buffer);
  }
}
