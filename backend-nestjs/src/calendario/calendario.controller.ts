import { Controller, Get, Post, Put, Body, Param, Query, Res, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { IsString, IsOptional, IsArray, IsDateString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarioService } from './calendario.service';
import { buildIcs } from './ical.util';

class IcalUrlsDto {
  @IsArray()
  icalImportUrls: string[];
}

class DisponibilidadQuery {
  @IsDateString()
  desde: string;

  @IsDateString()
  hasta: string;
}

@ApiTags('Calendario')
@Controller()
export class CalendarioController {
  constructor(
    private calendario: CalendarioService,
    private prisma: PrismaService,
  ) {}

  @Get('properties/:slug/availability')
  @ApiOperation({ summary: 'Disponibilidad combinada (reservas TROPICAL BIOHOSTEL + Airbnb/Booking)' })
  async availability(@Param('slug') slug: string, @Query() q: DisponibilidadQuery) {
    return this.calendario.disponibilidadPorSlug(slug, q.desde.slice(0, 10), q.hasta.slice(0, 10));
  }

  @Get('calendar/:archivo')
  @ApiOperation({ summary: 'Feed iCal público para pegar en Airbnb/Booking (sin datos personales)' })
  async feed(@Param('archivo') archivo: string, @Res() res: Response) {
    // Formato: <slug>--<token>.ics
    const m = String(archivo || '').match(/^(.+)--([a-f0-9]{32})\.ics$/);
    if (!m) throw new NotFoundException('Calendario no encontrado');
    const prop = await this.prisma.propiedad.findUnique({ where: { slug: m[1] } });
    if (!prop || prop.icalToken !== m[2]) throw new NotFoundException('Calendario no encontrado');
    const bloqueos = await this.calendario.bloqueosPropios(prop.id);
    const ics = buildIcs(prop.nombre, bloqueos);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${prop.slug}.ics"`);
    res.send(ics);
  }

  @Get('admin/properties/:id/ical-info')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estado de sincronización de una propiedad (admin)' })
  async info(@Param('id') id: string) {
    const prop = await this.prisma.propiedad.findUnique({
      where: { id },
      select: { id: true, slug: true, icalImportUrls: true, icalToken: true, lastIcalSyncAt: true },
    });
    if (!prop) throw new NotFoundException('Propiedad no encontrada');
    const { bloqueos } = await this.calendario.bloqueosExternos(id);
    return { ...prop, eventosExternos: bloqueos.length, bloqueos: bloqueos.slice(0, 60) };
  }

  @Put('admin/properties/:id/ical')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Guardar URLs iCal de Airbnb/Booking y sincronizar (admin)' })
  async guardar(@Param('id') id: string, @Body() dto: IcalUrlsDto) {
    return this.calendario.guardarImportUrls(id, dto.icalImportUrls || []);
  }

  @Post('admin/properties/:id/ical-refresh')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Forzar re-sincronización con Airbnb/Booking (admin)' })
  async refresh(@Param('id') id: string) {
    const { bloqueos } = await this.calendario.bloqueosExternos(id, true);
    return { eventosExternos: bloqueos.length, bloqueos: bloqueos.slice(0, 60) };
  }
}
