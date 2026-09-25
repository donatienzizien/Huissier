import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModelesActesService } from './modeles-actes.service';
import { CreateModeleActeDto } from './dto/create-modele-acte.dto';
import { UpdateModeleActeDto } from './dto/update-modele-acte.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('modeles-actes')
export class ModelesActesController {
  constructor(private readonly modelesActesService: ModelesActesService) {}

  @Get()
  findAll(@Query('actifOnly') actifOnly?: string) {
    return this.modelesActesService.findAll(actifOnly === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.modelesActesService.findOne(id);
  }

  @Roles('HUISSIER')
  @Post()
  create(@Body() dto: CreateModeleActeDto) {
    return this.modelesActesService.create(dto);
  }

  @Roles('HUISSIER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateModeleActeDto) {
    return this.modelesActesService.update(id, dto);
  }
}
