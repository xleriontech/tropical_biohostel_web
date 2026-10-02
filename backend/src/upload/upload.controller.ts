import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadService } from './upload.service';

const FILTRO_IMAGEN = (
  req: any,
  file: Express.Multer.File,
  cb: (err: Error | null, accept: boolean) => void,
) => {
  if (/^image\//.test(file.mimetype)) cb(null, true);
  else cb(new BadRequestException('Solo se permiten imágenes (jpg, png, gif, webp).'), false);
};

@ApiTags('Upload')
@Controller('admin/upload')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('certificate/:propertyId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir certificado' })
  async uploadCertificate(
    @Param('propertyId') propertyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = await this.uploadService.uploadCertificate(file, propertyId);
    return { url };
  }

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: FILTRO_IMAGEN,
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        carpeta: { type: 'string', example: 'ads' },
      },
    },
  })
  @ApiOperation({ summary: 'Subir imagen desde el PC (anuncios, logos, parallax, logo)' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { carpeta?: string },
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    return this.uploadService.subirGenerico(file, body?.carpeta);
  }
}
