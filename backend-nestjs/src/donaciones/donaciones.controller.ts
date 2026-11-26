import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsIn,
  IsEmail,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  ValidateNested,
} from 'class-validator';
import { DonacionesService } from './donaciones.service';
import { SiembraService } from './siembra.service';

class CrearOrdenDto {
  @IsString()
  @IsNotEmpty()
  proyectoId: string;

  @IsNumber()
  @Min(1)
  monto: number;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  mensaje?: string;
}

const sanitizarMedia = (media: any): { tipo: string; url: string }[] => {
  if (!Array.isArray(media)) return [];
  return media
    .filter((m) => m && (m.tipo === 'imagen' || m.tipo === 'video') && typeof m.url === 'string' && m.url.trim())
    .slice(0, 12)
    .map((m) => ({ tipo: m.tipo, url: m.url.trim().slice(0, 500) }));
};

class ProyectoDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsOptional()
  @IsIn(['ARBOLES', 'CARBONO', 'GENERAL'])
  categoria?: string;

  @IsOptional()
  @IsNumber()
  meta?: number | null;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @IsOptional()
  media?: { tipo: string; url: string }[];

  @IsOptional()
  @IsString()
  paypalLink?: string;

  @IsOptional()
  @IsIn(['ACTIVO', 'PAUSADO', 'COMPLETADO'])
  estado?: string;

  @IsOptional()
  @IsNumber()
  orden?: number;
}

class ReservarArbolDto {
  @IsNumber()
  @Min(0)
  fila: number;

  @IsNumber()
  @Min(0)
  columna: number;

  @IsIn(['CAFE', 'CACAO'])
  especie: 'CAFE' | 'CACAO';

  @IsOptional()
  @IsNumber()
  @Min(1)
  monto?: number;

  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  mensaje?: string;
}

class LineaCuidadoDto {
  @IsString()
  @IsNotEmpty()
  clave: string;

  @IsNumber()
  @Min(1)
  cantidad: number;
}

class ComprarCuidadoDto {
  @IsNumber()
  @Min(0)
  fila: number;

  @IsNumber()
  @Min(0)
  columna: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => LineaCuidadoDto)
  lineas: LineaCuidadoDto[];
}

class ActualizarArbolDto {
  @IsOptional()
  @IsIn(['SEMILLA', 'BROTE', 'JUVENIL', 'PRODUCTIVO'])
  etapa?: string;

  @IsOptional()
  @IsString()
  notasFinca?: string;

  @IsOptional()
  @IsString()
  fechaSiembra?: string;

  @IsOptional()
  confirmado?: boolean;
}

class ManualDto {
  @IsString()
  @IsNotEmpty()
  proyectoId: string;

  @IsNumber()
  @Min(1)
  monto: number;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  mensaje?: string;
}

@ApiTags('Donaciones')
@Controller('donaciones')
export class DonacionesController {
  constructor(
    private donaciones: DonacionesService,
    private siembra: SiembraService,
  ) {}

  @Get('siembra/tablero')
  @ApiOperation({ summary: 'Tablero de siembra: parcelas, estadísticas y monto (público)' })
  tablero() {
    return this.siembra.tablero();
  }

  @Post('siembra/reserva')
  @ApiOperation({ summary: 'Reservar parcela del tablero y crear la orden PayPal del árbol' })
  reserva(@Body() dto: ReservarArbolDto) {
    return this.siembra.reservar(dto);
  }

  @Post('siembra/cuidado')
  @ApiOperation({ summary: 'Comprar cuidados (riego, abono, sustrato) para el árbol de una casilla' })
  cuidado(@Body() dto: ComprarCuidadoDto) {
    return this.siembra.comprarCuidado(dto);
  }

  @Get('siembra/arbol/:codigo')
  @ApiOperation({ summary: 'Ficha del árbol apadrinado por su código (público)' })
  arbol(@Param('codigo') codigo: string) {
    return this.siembra.arbolPorCodigo(codigo);
  }

  @Get('proyectos')
  @ApiOperation({ summary: 'Proyectos activos con lo recaudado (público)' })
  proyectos() {
    return this.donaciones.proyectosActivos();
  }

  @Get('proyectos/:slug')
  @ApiOperation({ summary: 'Detalle de proyecto (público)' })
  proyecto(@Param('slug') slug: string) {
    return this.donaciones.proyectoPorSlug(slug);
  }

  @Get('paypal-public')
  @ApiOperation({ summary: 'Config pública de PayPal: clientId, modo, moneda (público)' })
  paypalPublic() {
    return this.donaciones.configPublica();
  }

  @Post('orden')
  @ApiOperation({ summary: 'Crear orden PayPal para donar' })
  orden(@Body() dto: CrearOrdenDto) {
    return this.donaciones.crearOrden(dto.proyectoId, dto.monto, dto);
  }

  @Post('capturar')
  @ApiOperation({ summary: 'Capturar orden aprobada en PayPal y registrar donación' })
  capturar(@Body() body: { orderId: string }) {
    return this.donaciones.capturarOrden(body.orderId);
  }
}

@ApiTags('Donaciones admin')
@Controller('admin/donaciones')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class DonacionesAdminController {
  constructor(
    private donaciones: DonacionesService,
    private siembra: SiembraService,
  ) {}

  @Get('siembra/arboles')
  @ApiOperation({ summary: 'Listar árboles apadrinados con su parcela y pago' })
  arboles() {
    return this.siembra.listarArboles();
  }

  @Patch('siembra/arbol/:id')
  @ApiOperation({ summary: 'Actualizar etapa, parte de la finca o confirmación de un árbol' })
  actualizarArbol(@Param('id') id: string, @Body() dto: ActualizarArbolDto) {
    return this.siembra.actualizarArbol(id, dto);
  }

  @Post('siembra/parcela/:id/liberar')
  @ApiOperation({ summary: 'Devolver una casilla al tablero (solo reservas sin pago)' })
  liberarParcela(@Param('id') id: string) {
    return this.siembra.liberarParcela(id);
  }

  @Get('resumen')
  @ApiOperation({ summary: 'Todos los proyectos con recaudado' })
  resumen() {
    return this.donaciones.resumen();
  }

  @Post('proyectos')
  @ApiOperation({ summary: 'Crear proyecto' })
  crear(@Body() dto: ProyectoDto) {
    return this.donaciones.crearProyecto(dto);
  }

  @Put('proyectos/:id')
  @ApiOperation({ summary: 'Actualizar proyecto' })
  actualizar(@Param('id') id: string, @Body() dto: Partial<ProyectoDto>) {
    return this.donaciones.actualizarProyecto(id, dto as any);
  }

  @Delete('proyectos/:id')
  @ApiOperation({ summary: 'Eliminar proyecto y sus donaciones' })
  eliminar(@Param('id') id: string) {
    return this.donaciones.eliminarProyecto(id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar donaciones' })
  listar(@Query('proyectoId') proyectoId?: string) {
    return this.donaciones.listarDonaciones(proyectoId);
  }

  @Post('manual')
  @ApiOperation({ summary: 'Registrar donación manual (efectivo, consignación)' })
  manual(@Body() dto: ManualDto) {
    return this.donaciones.registrarManual(dto);
  }
}
