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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { UploadService } from '../upload/upload.service';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsArray, IsEnum } from 'class-validator';

class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEnum(['hotel', 'hostal', 'centro_turistico', 'glamping', 'restaurante', 'bar', 'finca', 'actividad'])
  tipo: 'hotel' | 'hostal' | 'centro_turistico' | 'glamping' | 'restaurante' | 'bar' | 'finca' | 'actividad';

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  coordenadas?: any;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsNumber()
  estrellas?: number;

  @IsOptional()
  @IsString()
  horarioCheckIn?: string;

  @IsOptional()
  @IsString()
  horarioCheckOut?: string;

  @IsOptional()
  @IsString()
  reglamento?: string;

  @IsOptional()
  @IsString()
  politicasCancelacion?: string;

  @IsOptional()
  @IsBoolean()
  admiteMascotas?: boolean;

  @IsOptional()
  @IsBoolean()
  seguroDisponible?: boolean;

  @IsNumber()
  capacidadMaxima: number;

  @IsOptional()
  @IsNumber()
  numeroHabitaciones?: number;

  @IsNumber()
  precioNoche: number;

  @IsOptional()
  @IsArray()
  actividades?: string[];

  @IsOptional()
  @IsArray()
  videos?: string[];

  @IsOptional()
  @IsArray()
  servicioImagenes?: string[];

  @IsOptional()
  redesSociales?: Record<string, string>;

  @IsOptional()
  @IsEnum(['BORRADOR', 'PUBLICADO'])
  estado?: 'BORRADOR' | 'PUBLICADO';
}

class UpdatePropertyDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsEnum(['hotel', 'hostal', 'centro_turistico', 'glamping', 'restaurante', 'bar', 'finca', 'actividad']) tipo?: 'hotel' | 'hostal' | 'centro_turistico' | 'glamping' | 'restaurante' | 'bar' | 'finca' | 'actividad';
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsString() ubicacion?: string;
  @IsOptional() coordenadas?: any;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() ciudad?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsNumber() estrellas?: number;
  @IsOptional() @IsString() horarioCheckIn?: string;
  @IsOptional() @IsString() horarioCheckOut?: string;
  @IsOptional() @IsString() reglamento?: string;
  @IsOptional() @IsString() politicasCancelacion?: string;
  @IsOptional() @IsBoolean() admiteMascotas?: boolean;
  @IsOptional() @IsBoolean() seguroDisponible?: boolean;
  @IsOptional() @IsNumber() capacidadMaxima?: number;
  @IsOptional() @IsNumber() numeroHabitaciones?: number;
  @IsOptional() @IsNumber() precioNoche?: number;
  @IsOptional() @IsArray() actividades?: string[];
  @IsOptional() @IsArray() videos?: string[];
  @IsOptional() @IsArray() servicioImagenes?: string[];
  @IsOptional() redesSociales?: Record<string, string>;
  @IsOptional() @IsString() estado?: string;
}

@ApiTags('Properties')
@Controller()
export class PropertiesController {
  constructor(
    private propertiesService: PropertiesService,
    private uploadService: UploadService,
  ) {}

  @Get('properties')
  @ApiOperation({ summary: 'Listar propiedades (público)' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('tipo') tipo?: string,
    @Query('calificacionMin') calificacionMin?: string,
  ) {
    return this.propertiesService.findAll({ page, limit, tipo, estado: 'PUBLICADO', calificacionMin: calificacionMin ? parseInt(calificacionMin, 10) : undefined });
  }

  @Get('properties/:slug')
  @ApiOperation({ summary: 'Detalle de propiedad por slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.propertiesService.findBySlug(slug);
  }

  @Get('admin/properties')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todas las propiedades (admin)' })
  async findAllAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('tipo') tipo?: string,
  ) {
    return this.propertiesService.findAll({ page, limit, tipo });
  }

  @Get('admin/properties/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener propiedad por ID (admin)' })
  async findOneAdmin(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @Post('admin/properties')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear propiedad (admin)' })
  async create(@Body() dto: CreatePropertyDto) {
    return this.propertiesService.create({
      nombre: dto.nombre,
      tipo: dto.tipo,
      descripcion: dto.descripcion,
      ubicacion: dto.ubicacion,
      coordenadas: dto.coordenadas,
      admiteMascotas: dto.admiteMascotas || false,
      seguroDisponible: dto.seguroDisponible || false,
      capacidadMaxima: dto.capacidadMaxima,
      numeroHabitaciones: dto.numeroHabitaciones,
      precioNoche: dto.precioNoche,
      actividades: dto.actividades || [],
      videos: dto.videos || [],
      servicioImagenes: dto.servicioImagenes || [],
      redesSociales: dto.redesSociales || undefined,
      estado: dto.estado || 'BORRADOR',
    });
  }

  @Put('admin/properties/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar propiedad (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdatePropertyDto) {
    return this.propertiesService.update(id, dto as any);
  }

  @Delete('admin/properties/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar propiedad (admin)' })
  async remove(@Param('id') id: string) {
    return this.propertiesService.remove(id);
  }

  @Post('admin/properties/:id/images')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir imagen a propiedad (admin)' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { url, thumbUrl } = await this.uploadService.uploadImage(file, id);
    return this.propertiesService.addImage(id, url);
  }

  @Put('admin/images/:imageId/principal')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar imagen como principal (admin)' })
  async setPrincipal(@Param('imageId') imageId: string) {
    return this.propertiesService.setPrincipalImage(imageId);
  }
}
