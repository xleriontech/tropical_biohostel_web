import { Controller, Post, Get, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReservasService } from './reservas.service';
import { CreateReservaDto } from './dto/create-reserva.dto';

@ApiTags('Reservas')
@Controller('reservas')
export class ReservasController {
  constructor(private reservasService: ReservasService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear una reserva' })
  async create(@Body() dto: CreateReservaDto, @Req() req) {
    return this.reservasService.create(dto, req.user.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar reservas (admin)' })
  async findAll(
    @Query('propiedadId') propiedadId?: string,
    @Query('email') email?: string,
    @Query('estado') estado?: string,
    @Req() req?
  ) {
    const user = req.user;
    if (user.role === 'admin') {
      return this.reservasService.findAll({ propiedadId, email, estado });
    }
    return this.reservasService.findAll({ email: user.email, estado });
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener una reserva por ID' })
  async findOne(@Param('id') id: string) {
    return this.reservasService.findOne(id);
  }

  @Patch(':id/cancelar')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar una reserva' })
  async cancelar(@Param('id') id: string) {
    return this.reservasService.cancelar(id);
  }

  @Patch(':id/no-show')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar como no show (admin)' })
  async noShow(@Param('id') id: string) {
    return this.reservasService.confirmarNoShow(id);
  }
}
