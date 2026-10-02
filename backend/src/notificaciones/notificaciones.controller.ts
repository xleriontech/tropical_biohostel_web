import { Controller, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificacionesService } from './notificaciones.service';

@ApiTags('Notificaciones')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private notificacionesService: NotificacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificaciones del usuario' })
  async findAll(@Req() req, @Query('soloNoLeidas') soloNoLeidas?: string) {
    return this.notificacionesService.findByUser(req.user.id, soloNoLeidas === 'true');
  }

  @Get('count')
  @ApiOperation({ summary: 'Contar notificaciones no leídas' })
  async count(@Req() req) {
    return { count: await this.notificacionesService.countNoLeidas(req.user.id) };
  }

  @Patch(':id/leer')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  async marcarLeida(@Param('id') id: string, @Req() req) {
    return this.notificacionesService.markAsLeida(id, req.user.id);
  }

  @Patch('leer-todas')
  @ApiOperation({ summary: 'Marcar todas como leídas' })
  async marcarTodasLeidas(@Req() req) {
    return this.notificacionesService.markAllAsLeidas(req.user.id);
  }
}
