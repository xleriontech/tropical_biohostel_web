import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { IntegracionesService } from './integraciones.service';

class ClaveDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  webUrl?: string;

  @IsOptional()
  @IsString()
  valor?: string;
}

@ApiTags('Integraciones')
@Controller('admin/claves')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class IntegracionesController {
  constructor(private integraciones: IntegracionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar claves API (valores enmascarados)' })
  async listar() {
    return this.integraciones.listar();
  }

  @Get('estado')
  @ApiOperation({ summary: 'Qué integraciones tienen key configurada' })
  async estado() {
    return this.integraciones.estado();
  }

  @Put(':clave')
  @ApiOperation({ summary: 'Crear o actualizar una clave API (valor cifrado)' })
  async guardar(@Param('clave') clave: string, @Body() dto: ClaveDto) {
    return this.integraciones.guardar(clave, dto);
  }

  @Delete(':clave')
  @ApiOperation({ summary: 'Eliminar una clave API' })
  async eliminar(@Param('clave') clave: string) {
    return this.integraciones.eliminar(clave);
  }

  @Post(':clave/probar')
  @ApiOperation({ summary: 'Probar una clave guardada contra su API real' })
  async probar(@Param('clave') clave: string) {
    return this.integraciones.probar(clave);
  }
}
