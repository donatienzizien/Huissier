import { Module } from '@nestjs/common';
import { ModelesActesService } from './modeles-actes.service';
import { ModelesActesController } from './modeles-actes.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ModelesActesController],
  providers: [ModelesActesService],
  exports: [ModelesActesService],
})
export class ModelesActesModule {}
