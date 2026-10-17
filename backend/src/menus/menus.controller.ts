import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, Min } from 'class-validator';
import { MenusService, ComidaInput, PlatoInput } from './menus.service';

class PlatoDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsOptional() @IsString()
  descripcion?: string | null;

  @IsOptional() @IsString()
  categoria?: string | null;

  @IsOptional() @IsNumber() @Min(0)
  precio?: number | null;

  @IsOptional() @IsArray()
  etiquetas?: string[];

  @IsOptional() @IsNumber()
  orden?: number;
}

class ComidaDto {
  @IsString() @IsNotEmpty()
  titulo: string;

  @IsOptional() @IsString()
  slug?: string;

  @IsOptional() @IsString()
  tipo?: string;

  @IsOptional() @IsString()
  descripcion?: string | null;

  @IsOptional() @IsString()
  imagenUrl?: string | null;

  @IsOptional() @IsString()
  horario?: string | null;

  @IsOptional() @IsBoolean()
  activo?: boolean;

  @IsOptional() @IsNumber()
  orden?: number;

  @IsOptional() @IsArray()
  platos?: PlatoDto[];
}

@ApiTags('Comidas')
@Controller('menus')
export class MenusController {
  constructor(private menus: MenusService) {}

  @Get()
  @ApiOperation({ summary: 'Menús activos con platos (público)' })
  listar() {
    return this.menus.listarActivos();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Detalle de un menú por slug (público)' })
  porSlug(@Param('slug') slug: string) {
    return this.menus.porSlug(slug);
  }
}

@ApiTags('Comidas admin')
@Controller('admin/menus')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class MenusAdminController {
  constructor(private menus: MenusService) {}

  @Post(':id/image')
  @ApiOperation({ summary: 'Subir imagen para el menú (desde PC)' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    const result = await this.menus.uploadService.subirGenerico(file, `menu:${id}`);
    return { url: result.url };
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los menús, incluidos inactivos' })
  listar() {
    return this.menus.listarTodos();
  }

  @Post()
  @ApiOperation({ summary: 'Crear menú (con platos opcionales)' })
  crear(@Body() dto: ComidaDto) {
    return this.menus.crear(dto as ComidaInput);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar menú' })
  actualizar(@Param('id') id: string, @Body() dto: ComidaDto) {
    return this.menus.actualizar(id, dto as ComidaInput);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar menú y sus platos' })
  eliminar(@Param('id') id: string) {
    return this.menus.eliminar(id);
  }

  @Post(':id/platos')
  @ApiOperation({ summary: 'Agregar plato a un menú' })
  crearPlato(@Param('id') id: string, @Body() dto: PlatoDto) {
    return this.menus.agregarPlato(id, dto as PlatoInput);
  }

  @Put(':id/platos/:platoId')
  @ApiOperation({ summary: 'Actualizar plato' })
  actualizarPlato(
    @Param('id') id: string,
    @Param('platoId') platoId: string,
    @Body() dto: PlatoDto,
  ) {
    return this.menus.actualizarPlato(id, platoId, dto as PlatoInput);
  }

  @Delete(':id/platos/:platoId')
  @ApiOperation({ summary: 'Eliminar plato' })
  eliminarPlato(@Param('id') id: string, @Param('platoId') platoId: string) {
    return this.menus.eliminarPlato(id, platoId);
  }
}
