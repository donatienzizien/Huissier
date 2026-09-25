import { Module } from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { AgendaController } from './agenda.controller';
import { RemindersService } from './reminders.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AgendaController],
  providers: [AgendaService, RemindersService],
})
export class AgendaModule {}
