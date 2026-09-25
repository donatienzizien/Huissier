import { Module } from '@nestjs/common';
import { ActesService } from './actes.service';
import { ActesController } from './actes.controller';
import { AuthModule } from '../auth/auth.module';
import { ModelesActesModule } from '../modeles-actes/modeles-actes.module';

@Module({
  imports: [AuthModule, ModelesActesModule],
  controllers: [ActesController],
  providers: [ActesService],
  exports: [ActesService],
})
export class ActesModule {}
