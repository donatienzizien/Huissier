import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';

const AVATAR_URL_SECRET = process.env.AVATAR_URL_SECRET;
const AVATAR_URL_EXPIRATION = Number(process.env.AVATAR_URL_EXPIRATION ?? 300);

function creerSignature(userId: string, expiration: number): string {
  return crypto
    .createHmac('sha256', AVATAR_URL_SECRET as string)
    .update(`${userId}:${expiration}`)
    .digest('hex');
}

@Controller('avatars')
export class AvatarsController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':userId/signed-url')
  @UseGuards(JwtAuthGuard)
  async creerUrlSignee(
    @Param('userId') userId: string,
    @CurrentUser() utilisateur: AuthenticatedUser,
  ) {
    if (!AVATAR_URL_SECRET) {
      throw new Error('AVATAR_URL_SECRET n’est pas configuré.');
    }

    const cheminFichier = await this.usersService.getPhotoPath(userId);

    if (!cheminFichier) {
      throw new NotFoundException('Aucune photo pour cet utilisateur.');
    }

    const expiration = Math.floor(Date.now() / 1000) + AVATAR_URL_EXPIRATION;
    const signature = creerSignature(userId, expiration);

    return {
      url: `/api/avatars/${userId}/file?expires=${expiration}&signature=${signature}`,
      expiresAt: new Date(expiration * 1000).toISOString(),
    };
  }

  @Get(':userId/file')
  async servir(
    @Param('userId') userId: string,
    @Query('expires') expires: string,
    @Query('signature') signature: string,
    @Res() res: Response,
  ) {
    if (!AVATAR_URL_SECRET) {
      throw new Error('AVATAR_URL_SECRET n’est pas configuré.');
    }

    if (!userId || !expires || !signature) {
      throw new BadRequestException('Paramètres de signature manquants.');
    }

    const expiration = Number(expires);

    if (!Number.isFinite(expiration) || expiration < Math.floor(Date.now() / 1000)) {
      throw new ForbiddenException('URL expirée.');
    }

    const signatureAttendue = creerSignature(userId, expiration);

    const signatureValide = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(signatureAttendue),
    );

    if (!signatureValide) {
      throw new ForbiddenException('Signature invalide.');
    }

    const cheminFichier = await this.usersService.getPhotoPath(userId);

    if (!cheminFichier) {
      throw new NotFoundException('Aucune photo pour cet utilisateur.');
    }

    const storageRoot = path.resolve(
      process.env.ACTES_STORAGE_PATH ?? path.join(process.cwd(), 'storage'),
    );
    const cheminAbsolu = path.resolve(cheminFichier);

    if (!cheminAbsolu.startsWith(storageRoot)) {
      throw new ForbiddenException('Chemin de fichier invalide.');
    }

    res.setHeader('Cache-Control', 'private, max-age=300');
    createReadStream(cheminAbsolu).pipe(res);
  }
}