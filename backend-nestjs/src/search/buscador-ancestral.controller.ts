import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SmartSearchService } from './smart-search.service';

class AncestralDto {
  @IsInt()
  @Min(1)
  @Max(30)
  adultos: number;

  @IsInt()
  @Min(0)
  @Max(20)
  ninos: number;

  @IsBoolean()
  llevaMascotas: boolean;

  @IsInt()
  @Min(0)
  @Max(20)
  habitacionesMin: number;

  @IsInt()
  @Min(0)
  @Max(10)
  banosMin: number;

  @IsOptional()
  tipo?: 'hotel' | 'hostal' | 'centro_turistico' | 'glamping' | 'restaurante' | 'bar' | 'finca' | 'actividad' | null;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  presupuestoMax?: number | null;

  @IsArray()
  planes: string[];

  @IsArray()
  extras: string[];

  @IsOptional()
  @IsString()
  textoLibre?: string;
}

@ApiTags('Zemisqua - Buscador Ancestral')
@Controller('busqueda')
export class BuscadorAncestralController {
  constructor(private smartSearch: SmartSearchService) {}

  @Get('opciones')
  @ApiOperation({ summary: 'Facetas vivas del catálogo para el cuestionario (tipos, actividades, precios)' })
  async opciones() {
    return this.smartSearch.opciones();
  }

  @Post('ancestral')
  @ApiOperation({ summary: 'Zemisqua: cuestionario + texto libre contra el RAG, con mensaje y fuentes' })
  async ancestral(@Body() dto: AncestralDto) {
    return this.smartSearch.buscarAncestral({
      adultos: dto.adultos,
      ninos: dto.ninos || 0,
      llevaMascotas: dto.llevaMascotas || false,
      habitacionesMin: dto.habitacionesMin || 0,
      banosMin: dto.banosMin || 0,
      tipo: (dto.tipo || null) as any,
      presupuestoMax: dto.presupuestoMax || null,
      planes: (dto.planes || []) as any,
      extras: (dto.extras || []) as any,
      textoLibre: dto.textoLibre || '',
    });
  }
}
