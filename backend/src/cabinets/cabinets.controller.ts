import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CabinetsService } from './cabinets.service';
import { CreateCabinetDto } from './dto/create-cabinet.dto';
import { UpdateCabinetDto } from './dto/update-cabinet.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('cabinets')
export class CabinetsController {
  constructor(
    private readonly cabinetsService: CabinetsService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get()
  list() {
    return this.cabinetsService.list();
  }

  @Post()
  create(@Body() dto: CreateCabinetDto) {
    return this.cabinetsService.create(dto);
  }

  @Patch(':id/suspendre')
  suspendre(@Param('id') id: string) {
    return this.cabinetsService.suspendre(id);
  }

  @Patch(':id/reactiver')
  reactiver(@Param('id') id: string) {
    return this.cabinetsService.reactiver(id);
  }

  // Auto-gestion par le Huissier lui-même — remplace la restriction
  // SUPER_ADMIN de la classe pour ces deux routes précises, et se limite
  // strictement à SON PROPRE cabinet (résolu via le contexte tenant, pas
  // via un :id arbitraire dans l'URL).
  @Roles('HUISSIER')
  @Get('moi')
  monCabinet() {
    const { id } = this.tenantContext.get();
    return this.cabinetsService.monCabinet(id);
  }

  @Roles('HUISSIER')
  @Patch('moi')
  modifierMonCabinet(@Body() dto: UpdateCabinetDto) {
    const { id } = this.tenantContext.get();
    return this.cabinetsService.modifierMonCabinet(id, dto);
  }
}