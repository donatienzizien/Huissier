import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { UsersService } from './users.service';

// Volontairement SANS JwtAuthGuard : une balise <img src="..."> ne peut
// pas transmettre de jeton Bearer. Les identifiants sont des UUID non
// devinables (comme partout ailleurs dans l'app), et la résolution du
// tenant par sous-domaine reste appliquée normalement par le middleware
// global — seule l'authentification JWT est volontairement omise ici.
@Controller('avatars')
export class AvatarsController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':userId')
  async servir(@Param('userId') userId: string, @Res() res: Response) {
    const cheminFichier = await this.usersService.getPhotoPath(userId);
    if (!cheminFichier) {
      throw new NotFoundException('Aucune photo pour cet utilisateur.');
    }
    res.setHeader('Cache-Control', 'private, max-age=3600');
    createReadStream(cheminFichier).pipe(res);
  }
}
