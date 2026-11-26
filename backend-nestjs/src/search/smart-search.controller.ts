import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SmartSearchService } from './smart-search.service';

class SmartSearchDto {
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
  @IsEnum(['hotel', 'hostal', 'centro_turistico', 'glamping', 'restaurante', 'bar', 'finca', 'actividad'])
  tipo?: 'hotel' | 'hostal' | 'centro_turistico' | 'glamping' | 'restaurante' | 'bar' | 'finca' | 'actividad' | null;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  presupuestoMax?: number | null;

  @IsArray()
  @IsIn(
    ['descanso', 'aventura', 'romance', 'familia', 'naturaleza', 'cafe'],
    { each: true },
  )
  planes: string[];

  @IsArray()
  @IsIn(
    ['piscina', 'wifi', 'cocina', 'parqueadero', 'desayuno', 'chimenea', 'jacuzzi', 'vista', 'seguro'],
    { each: true },
  )
  extras: string[];
}

@ApiTags('SmartSearch')
@Controller('smart-search')
export class SmartSearchController {
  constructor(private smartSearch: SmartSearchService) {}

  @Post()
  @ApiOperation({ summary: 'Búsqueda inteligente por cuestionario con compatibilidad' })
  async search(@Body() dto: SmartSearchDto) {
    return this.smartSearch.search({
      adultos: dto.adultos,
      ninos: dto.ninos || 0,
      llevaMascotas: dto.llevaMascotas || false,
      habitacionesMin: dto.habitacionesMin || 0,
      banosMin: dto.banosMin || 0,
      tipo: dto.tipo || null,
      presupuestoMax: dto.presupuestoMax || null,
      planes: (dto.planes || []) as any,
      extras: (dto.extras || []) as any,
    });
  }
}
