import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { CreateRelanceDto } from './dto/create-relance.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(@Query() query: QueryClientsDto) {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Roles('HUISSIER', 'CLERC')
  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Roles('HUISSIER', 'CLERC')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Roles('HUISSIER', 'CLERC', 'COMPTABLE')
  @Post(':id/relances')
  ajouterRelance(
    @Param('id') id: string,
    @Body() dto: CreateRelanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientsService.ajouterRelance(id, dto, user.sub);
  }

  @Roles('HUISSIER', 'CLERC')
  @Post(':id/acces-portail')
  donnerAccesPortail(@Param('id') id: string) {
    return this.clientsService.donnerAccesPortail(id);
  }

  @Roles('HUISSIER', 'CLERC')
  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: 2 * 1024 * 1024 } }))
  uploaderLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    return this.clientsService.uploadLogo(id, file);
  }

  @Roles('HUISSIER', 'CLERC')
  @Delete(':id/logo')
  supprimerLogo(@Param('id') id: string) {
    return this.clientsService.removeLogo(id);
  }

  // Servi sans restriction de rôle (comme les avatars) : n'importe quel
  // utilisateur connecté du cabinet peut afficher un logo déjà stocké.
  @Get(':id/logo')
  async telechargerLogo(@Param('id') id: string, @Res() res: Response) {
    const cheminLogo = await this.clientsService.getLogoPath(id);
    if (!cheminLogo) throw new BadRequestException('Aucun logo pour ce client.');
    const buffer = await readFile(cheminLogo);
    const extension = cheminLogo.split('.').pop();
    const mime = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.send(buffer);
  }

  // Bloquée si des dossiers sont rattachés (voir ClientsService.remove) —
  // protège l'historique d'une procédure réelle contre une suppression
  // accidentelle.
  @Roles('HUISSIER', 'CLERC')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}