import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangerMotDePasseDto } from './dto/changer-mot-de-passe.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.list();
  }

  @Roles('HUISSIER')
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Roles('HUISSIER')
  @Patch(':id/desactiver')
  desactiver(@Param('id') id: string) {
    return this.usersService.desactiver(id);
  }

  @Roles('HUISSIER')
  @Patch(':id/reactiver')
  reactiver(@Param('id') id: string) {
    return this.usersService.reactiver(id);
  }

  @Roles('HUISSIER')
  @Delete(':id')
  supprimer(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.supprimer(id, user.sub);
  }

  // Accessible a tout utilisateur connecte (aucun role requis) : chacun
  // ne peut changer que son propre mot de passe, jamais celui d'un autre.
  @Patch('moi/mot-de-passe')
  changerMotDePasse(@Body() dto: ChangerMotDePasseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.changerMotDePasse(user.sub, dto);
  }

  // Upload/remplacement de la photo de profil - toujours sur SON PROPRE
  // compte (user.sub), jamais sur un id fourni par le client.
  @Post('moi/photo')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 2 * 1024 * 1024 } }))
  uploaderPhoto(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    if (!file) throw new BadRequestException('Aucun fichier recu.');
    return this.usersService.uploadPhoto(user.sub, file);
  }

  @Delete('moi/photo')
  supprimerPhoto(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.removePhoto(user.sub);
  }
}
