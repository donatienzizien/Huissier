import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { DossiersService } from './dossiers.service';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateStatutDossierDto } from './dto/update-statut-dossier.dto';
import { UpdateTiersDossierDto } from './dto/update-tiers-dossier.dto';
import { AssignerClercDto } from './dto/assigner-clerc.dto';
import { AssignerAgentDto } from './dto/assigner-agent.dto';
import { QueryDossiersDto } from './dto/query-dossiers.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dossiers')
export class DossiersController {
  constructor(private readonly dossiersService: DossiersService) {}

  @Get()
  findAll(@Query() query: QueryDossiersDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dossiersService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dossiersService.findOne(id, user);
  }

  @Roles('HUISSIER', 'CLERC')
  @Post()
  create(@Body() dto: CreateDossierDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dossiersService.create(dto, user.sub);
  }

  @Roles('HUISSIER', 'CLERC')
  @Patch(':id/statut')
  updateStatut(
    @Param('id') id: string,
    @Body() dto: UpdateStatutDossierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dossiersService.updateStatut(id, dto, user.sub);
  }

  @Roles('HUISSIER')
  @Patch(':id/tiers')
  updateTiers(
    @Param('id') id: string,
    @Body() dto: UpdateTiersDossierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dossiersService.updateTiers(id, dto, user.sub);
  }

  // Attribution du Clerc responsable - controle fin (Huissier uniquement)
  // fait dans le service, pas via @Roles, pour un message d'erreur clair.
  @Roles('HUISSIER', 'CLERC')
  @Patch(':id/assigner-clerc')
  assignerClerc(
    @Param('id') id: string,
    @Body() dto: AssignerClercDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dossiersService.assignerClerc(id, dto, user);
  }

  // Attribution de l'agent terrain - Huissier ou Clerc responsable du
  // dossier (verifie dans le service).
  @Roles('HUISSIER', 'CLERC')
  @Patch(':id/assigner-agent')
  assignerAgent(
    @Param('id') id: string,
    @Body() dto: AssignerAgentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dossiersService.assignerAgent(id, dto, user);
  }

  @Roles('HUISSIER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dossiersService.remove(id);
  }
}

