import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsBoolean, IsArray } from 'class-validator';
import { IngestionService, FormatoIngesta } from './ingestion.service';
import { VerificacionService } from './verificacion.service';
import { IntegracionesService } from '../integraciones/integraciones.service';

class PreviewDto {
  @IsIn(['json', 'csv', 'texto'])
  formato: FormatoIngesta;

  @IsString()
  @IsNotEmpty()
  contenido: string;

  @IsOptional()
  @IsString()
  municipio?: string;
}

class ScrapeDto {
  @IsString()
  @IsNotEmpty()
  municipio: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsArray()
  tipos?: string[];
}

class ExecuteItemDto {
  @IsOptional()
  datos: any;

  @IsIn(['crear', 'actualizar', 'omitir'])
  accion: 'crear' | 'actualizar' | 'omitir';

  @IsOptional()
  @IsString()
  slugObjetivo?: string;
}

class ExecuteDto {
  @IsArray()
  items: ExecuteItemDto[];

  @IsOptional()
  @IsBoolean()
  publicarNuevos?: boolean;
}

@ApiTags('Ingestion')
@Controller('admin/ingestion')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class IngestionController {
  constructor(
    private ingestion: IngestionService,
    private verificacion: VerificacionService,
    private integraciones: IntegracionesService,
  ) {}

  @Post('preview')
  @ApiOperation({ summary: 'Analizar datos pegados y cruzar con sitios existentes' })
  async preview(@Body() dto: PreviewDto) {
    return this.ingestion.preview(dto.formato, dto.contenido, dto.municipio);
  }

  @Post('scrape')
  @ApiOperation({ summary: 'Buscar sitios reales del municipio en OpenStreetMap' })
  async scrape(@Body() dto: ScrapeDto) {
    return this.ingestion.scrapeMunicipio(dto.municipio, dto.departamento || 'Cundinamarca', dto.tipos);
  }

  @Post('enriquecer')
  @ApiOperation({ summary: 'Completar filas visitando la web de cada sitio (precios, fotos, contacto)' })
  async enriquecer(@Body() dto: { rows: Array<{ datos: any }> }) {
    return this.ingestion.enriquecer(dto.rows || []);
  }

  @Post('verificar')
  @ApiOperation({ summary: 'Re-verificar un municipio contra el mapa actual' })
  async verificar(@Body() dto: { municipio: string; departamento?: string }) {
    return this.verificacion.verificarMunicipio(dto.municipio, dto.departamento || 'Cundinamarca');
  }

  @Get('estado')
  @ApiOperation({ summary: 'Salud de datos: sitios sin verificar hace 90+ días' })
  async estado() {
    return this.verificacion.sinVerificar(90);
  }

  @Get('actualizaciones')
  @ApiOperation({ summary: 'Historial de verificaciones y cambios detectados' })
  async historial(@Query('estado') estado?: string) {
    return this.verificacion.historial(estado);
  }

  @Post('actualizaciones/:id/resolver')
  @ApiOperation({ summary: 'Resolver un hallazgo: aplicado, descartado o archivar sitio' })
  async resolver(@Param('id') id: string, @Body() dto: { accion: 'aplicado' | 'descartado' | 'archivar' }) {
    return this.verificacion.resolver(id, dto.accion);
  }

  @Post('google')
  @ApiOperation({ summary: 'Enriquecer con Google Places (usa key guardada si no se envía)' })
  async google(@Body() dto: { rows: Array<{ datos: any }>; apiKey?: string }) {
    let key = dto.apiKey?.trim() || '';
    if (!key) key = (await this.integraciones.valorInterno('google_places')) || '';
    return this.verificacion.enriquecerGoogle(dto.rows || [], key);
  }

  @Post('execute')
  @ApiOperation({ summary: 'Ejecutar importación (crear / actualizar sitios)' })
  async execute(@Body() dto: ExecuteDto) {
    return this.ingestion.execute(dto.items || [], !!dto.publicarNuevos);
  }
}
