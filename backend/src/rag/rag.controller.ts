import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { RagService } from './rag.service';

class CrearDocumentoDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  contenido: string;

  @IsOptional()
  @IsIn(['md', 'txt', 'html'])
  tipo?: string;
}

class BuscarDto {
  @IsString()
  @IsNotEmpty()
  q: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  k?: number;
}

const FILTRO_TEXTO = (
  req: any,
  file: Express.Multer.File,
  cb: (err: Error | null, accept: boolean) => void,
) => {
  if (/\.(md|markdown|txt|html?)$/i.test(file.originalname)) cb(null, true);
  else cb(new BadRequestException('Solo .md, .txt o .html (máx 2 MB).'), false);
};

@ApiTags('RAG - Base de conocimiento de Nati')
@Controller('admin/rag')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class RagController {
  constructor(private rag: RagService) {}

  @Get('estado')
  @ApiOperation({ summary: 'Estadísticas de la base de conocimiento' })
  estado() {
    return this.rag.estado();
  }

  @Get('proveedores')
  @ApiOperation({ summary: 'Proveedores disponibles como motor de embeddings' })
  proveedores() {
    return this.rag.listarProveedores();
  }

  @Get('motor')
  @ApiOperation({ summary: 'Motor de embeddings actual (null = automático)' })
  motor() {
    return this.rag.getMotor();
  }

  @Put('motor')
  @ApiOperation({ summary: 'Elegir motor de embeddings del RAG' })
  setMotor(@Body() body: { providerId?: string | null; modelo?: string | null }) {
    return this.rag.setMotor({
      providerId: body.providerId ?? null,
      modelo: body.modelo ?? null,
    });
  }

  @Get('documentos')
  @ApiOperation({ summary: 'Listar documentos' })
  documentos() {
    return this.rag.listar();
  }

  @Get('documentos/:id')
  @ApiOperation({ summary: 'Detalle con texto fuente (para editar)' })
  documento(@Param('id') id: string) {
    return this.rag.obtener(id);
  }

  @Get('buscar')
  @ApiOperation({ summary: 'Probar la búsqueda (vectorial o texto)' })
  buscar(@Query() dto: BuscarDto) {
    return this.rag.buscar(dto.q, dto.k || 4);
  }

  @Post('documentos')
  @ApiOperation({ summary: 'Crear documento desde texto' })
  crear(@Body() dto: CrearDocumentoDto) {
    return this.rag.crearDocumento({
      titulo: dto.titulo,
      contenido: dto.contenido,
      fuente: 'manual',
      tipo: dto.tipo || 'md',
    });
  }

  @Post('documentos/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: FILTRO_TEXTO,
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Subir documento .md/.txt/.html' })
  async subir(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    const contenido = file.buffer.toString('utf8');
    const base = file.originalname.replace(/\.[^.]+$/, '');
    return this.rag.crearDocumento({
      titulo: base,
      contenido,
      fuente: 'upload',
      tipo: /\.html?$/i.test(file.originalname) ? 'html' : 'md',
    });
  }

  @Post('documentos/desde-docs')
  @ApiOperation({ summary: 'Importar (o reindexar) los .md de la carpeta docs/' })
  desdeDocs() {
    return this.rag.importarDocsCarpeta();
  }

  @Post('documentos/:id/reindexar')
  @ApiOperation({ summary: 'Reindexar un documento (nuevos embeddings con el proveedor actual)' })
  reindexar(@Param('id') id: string) {
    return this.rag.reindexar(id);
  }

  @Put('documentos/:id')
  @ApiOperation({ summary: 'Editar título/contenido y reindexar' })
  editar(@Param('id') id: string, @Body() body: { titulo?: string; contenido?: string }) {
    return this.rag.editar(id, body);
  }

  @Delete('documentos/:id')
  @ApiOperation({ summary: 'Eliminar un documento y sus fragmentos' })
  eliminar(@Param('id') id: string) {
    return this.rag.eliminar(id);
  }
}
