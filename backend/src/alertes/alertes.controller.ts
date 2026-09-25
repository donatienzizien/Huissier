import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlertesService } from './alertes.service';

@UseGuards(JwtAuthGuard)
@Controller('alertes')
export class AlertesController {
  constructor(private readonly alertesService: AlertesService) {}

  @Get()
  findAll() {
    return this.alertesService.findAll();
  }
}