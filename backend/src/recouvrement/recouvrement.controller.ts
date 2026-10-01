import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecouvrementService } from './recouvrement.service';
import { CreateCreanceDto } from './dto/create-creance.dto';
import { UpdateCreanceDto } from './dto/update-creance.dto';
import { UpdateStatutCreanceDto } from './dto/update-statut-creance.dto';
import { QueryCreancesDto } from './dto/query-creances.dto';
import { CreateEncaissementDto } from './dto/create-encaissement.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recouvrement')
export class RecouvrementController {
  constructor(private readonly recouvrementService: RecouvrementService) {}

  @Get()
  findAll(@Query() query: QueryCreancesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.recouvrementService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.recouvrementService.findOne(id, user);
  }

  @Roles('HUISSIER', 'CLERC')
  @Post()
  create(@Body() dto: CreateCreanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.recouvrementService.create(dto, user);
  }

  @Roles('HUISSIER', 'CLERC')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCreanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recouvrementService.update(id, dto, user);
  }

  @Get(':id/encaissements')
  findEncaissements(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recouvrementService.findEncaissements(id, user);
  }

  @Roles('HUISSIER', 'CLERC')
  @Post(':id/encaissements')
  ajouterEncaissement(
    @Param('id') id: string,
    @Body() dto: CreateEncaissementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recouvrementService.ajouterEncaissement(id, dto, user);
  }

  @Roles('HUISSIER', 'CLERC')
  @Patch(':id/statut')
  updateStatut(
    @Param('id') id: string,
    @Body() dto: UpdateStatutCreanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recouvrementService.updateStatut(id, dto, user);
  }
}
