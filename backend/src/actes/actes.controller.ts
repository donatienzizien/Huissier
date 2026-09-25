import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ActesService } from './actes.service';
import { CreateActeDto } from './dto/create-acte.dto';
import { QueryActesDto } from './dto/query-actes.dto';
import { MarquerNotifieDto } from './dto/marquer-notifie.dto';
import { UpdateBrouillonDto } from './dto/update-brouillon.dto';
import { RejeterActeDto } from './dto/rejeter-acte.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('actes')
export class ActesController {
  constructor(private readonly actesService: ActesService) {}

  @Get()
  findAll(@Query('dossierId') dossierId: string | undefined, @Query() query: QueryActesDto) {
    if (dossierId) {
      return this.actesService.findByDossier(dossierId);
    }
    return this.actesService.findAll(query);
  }

  // File d'attente de validation, filtree selon ce que le role courant
  // peut effectivement valider.
  @Roles('HUISSIER')
  
  findEnAttenteValidation(@CurrentUser() user: AuthenticatedUser) {
    return this.actesService.findEnAttenteValidation(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.actesService.findOne(id);
  }

  // Apercu du document fusionne, sans creation ni consommation de numero -
  // utilise pour l'edition libre avant enregistrement du brouillon.
  @Roles('HUISSIER', 'CLERC', 'SECRETAIRE')
  @Post('apercu')
  apercu(@Body() dto: CreateActeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.actesService.apercu(dto, user.sub);
  }

  @Roles('HUISSIER', 'CLERC', 'SECRETAIRE')
  @Post()
  create(@Body() dto: CreateActeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.actesService.create(dto, user.sub);
  }

  @Roles('HUISSIER', 'CLERC', 'SECRETAIRE')
  @Patch(':id/brouillon')
  modifierBrouillon(
    @Param('id') id: string,
    @Body() dto: UpdateBrouillonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actesService.modifierBrouillon(id, dto, user.sub);
  }

  @Roles('HUISSIER', 'CLERC', 'SECRETAIRE')
  @Patch(':id/soumettre')
  soumettre(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.actesService.soumettre(id, user.sub);
  }

  @Roles('HUISSIER')
  
  corrigerEnAttente(
    @Param('id') id: string,
    @Body() dto: UpdateBrouillonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actesService.corrigerEnAttente(id, dto, user);
  }

  @Roles('HUISSIER')
  
  valider(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.actesService.valider(id, user);
  }

  @Roles('HUISSIER')
  
  rejeter(
    @Param('id') id: string,
    @Body() dto: RejeterActeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actesService.rejeter(id, dto, user);
  }

  @Get(':id/pdf')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { buffer, numero } = await this.actesService.getPdfBuffer(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${numero}.pdf"`);
    res.send(buffer);
  }

  @Get(':id/docx')
  async downloadDocx(@Param('id') id: string, @Res() res: Response) {
    const { buffer, numero } = await this.actesService.getDocxBuffer(id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${numero}.docx"`);
    res.send(buffer);
  }

  @Roles('HUISSIER')
  
  envoyerAuClient(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.actesService.envoyerAuClient(id, user.sub);
  }

  @Roles('HUISSIER')
  
  marquerSigne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.actesService.marquerSigne(id, user.sub);
  }

  @Roles('HUISSIER')
  
  marquerNotifie(
    @Param('id') id: string,
    @Body() dto: MarquerNotifieDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actesService.marquerNotifie(id, dto, user.sub);
  }

  @Roles('HUISSIER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.actesService.remove(id);
  }
}



