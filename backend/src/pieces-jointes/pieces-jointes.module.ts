import { Module } from '@nestjs/common';
import { PiecesJointesService } from './pieces-jointes.service';
import { PiecesJointesController } from './pieces-jointes.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PiecesJointesController],
  providers: [PiecesJointesService],
})
export class PiecesJointesModule {}
