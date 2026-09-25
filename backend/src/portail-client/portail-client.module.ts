import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PortailClientController } from './portail-client.controller';
import { PortailClientAuthService } from './portail-client-auth.service';
import { PortailClientService } from './portail-client.service';
import { JwtPortailStrategy } from './strategies/jwt-portail.strategy';
import { JwtPortailAuthGuard } from './guards/jwt-portail-auth.guard';
import { ActesModule } from '../actes/actes.module';
import { FacturationModule } from '../facturation/facturation.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), ActesModule, FacturationModule],
  controllers: [PortailClientController],
  providers: [PortailClientAuthService, PortailClientService, JwtPortailStrategy, JwtPortailAuthGuard],
})
export class PortailClientModule {}