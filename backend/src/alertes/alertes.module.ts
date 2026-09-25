import { Module } from '@nestjs/common';
import { AlertesService } from './alertes.service';
import { AlertesController } from './alertes.controller';
import { AlertesClientsService } from './alertes-clients.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AlertesController],
  providers: [AlertesService, AlertesClientsService],
})
export class AlertesModule {}
