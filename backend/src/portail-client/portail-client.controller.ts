import { Controller, Get, Param, Post, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { PortailClientAuthService } from './portail-client-auth.service';
import { PortailClientService } from './portail-client.service';
import { JwtPortailAuthGuard } from './guards/jwt-portail-auth.guard';
import { CurrentClient, AuthenticatedClient } from './decorators/current-client.decorator';
import { LoginPortailDto } from './dto/login-portail.dto';

@Controller('portail-client')
export class PortailClientController {
  constructor(
    private readonly authService: PortailClientAuthService,
    private readonly portailService: PortailClientService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginPortailDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtPortailAuthGuard)
  @Get('moi')
  moi(@CurrentClient() client: AuthenticatedClient) {
    return this.portailService.moi(client.sub);
  }

  @UseGuards(JwtPortailAuthGuard)
  @Get('dossiers')
  mesDossiers(@CurrentClient() client: AuthenticatedClient) {
    return this.portailService.mesDossiers(client.sub);
  }

  @UseGuards(JwtPortailAuthGuard)
  @Get('dossiers/:id')
  unDossier(@Param('id') id: string, @CurrentClient() client: AuthenticatedClient) {
    return this.portailService.unDossier(id, client.sub);
  }

  @UseGuards(JwtPortailAuthGuard)
  @Get('factures')
  mesFactures(@CurrentClient() client: AuthenticatedClient) {
    return this.portailService.mesFactures(client.sub);
  }

  @UseGuards(JwtPortailAuthGuard)
  @Get('actes/:id/pdf')
  async telechargerActe(
    @Param('id') id: string,
    @CurrentClient() client: AuthenticatedClient,
    @Res() res: Response,
  ) {
    const { buffer, numero } = await this.portailService.acteUnPdf(id, client.sub);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${numero}.pdf"`);
    res.send(buffer);
  }

  @UseGuards(JwtPortailAuthGuard)
  @Get('factures/:id/pdf')
  async telechargerFacture(
    @Param('id') id: string,
    @CurrentClient() client: AuthenticatedClient,
    @Res() res: Response,
  ) {
    const { buffer, numero } = await this.portailService.factureUnPdf(id, client.sub);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${numero}.pdf"`);
    res.send(buffer);
  }
}