import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PiecesJointesService } from './pieces-jointes.service';
import { CreatePieceJointeDto } from './dto/create-piece-jointe.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pieces-jointes')
export class PiecesJointesController {
  constructor(private readonly piecesJointesService: PiecesJointesService) {}

  @Get()
  findByDossier(@Query('dossierId') dossierId: string) {
    return this.piecesJointesService.findByDossier(dossierId);
  }

  @Roles('HUISSIER', 'CLERC')
  @Post()
  @UseInterceptors(
    FileInterceptor('fichier', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() fichier: Express.Multer.File,
    @Body() dto: CreatePieceJointeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.piecesJointesService.upload(fichier, dto, user.sub);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { buffer, nomOriginal, typeMime } = await this.piecesJointesService.getBuffer(id);
    res.setHeader('Content-Type', typeMime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nomOriginal)}"`);
    res.send(buffer);
  }

  @Roles('HUISSIER', 'CLERC')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.piecesJointesService.remove(id);
  }
}
