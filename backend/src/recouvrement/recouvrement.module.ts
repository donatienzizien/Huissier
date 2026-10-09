import { Module } from '@nestjs/common';
import { PdfModule } from '../pdf/pdf.module';
import { AuthModule } from '../auth/auth.module';
import { RecouvrementController } from './recouvrement.controller';
import { RecouvrementService } from './recouvrement.service';

@Module({
  imports: [AuthModule, PdfModule],
  controllers: [RecouvrementController],
  providers: [RecouvrementService],
  exports: [RecouvrementService],
})
export class RecouvrementModule {}
