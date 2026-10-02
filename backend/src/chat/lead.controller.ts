import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Leads del chat')
@Controller('admin/leads')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class LeadController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de interesados para decisiones' })
  async stats() {
    const [total, conNombre, conContacto, mensajes, ultimos, todos] = await Promise.all([
      this.prisma.leadChat.count(),
      this.prisma.leadChat.count({ where: { nombre: { not: null } } }),
      this.prisma.leadChat.count({
        where: { OR: [{ email: { not: null } }, { telefono: { not: null } }] },
      }),
      this.prisma.leadChat.aggregate({ _sum: { mensajesTotal: true } }),
      this.prisma.leadChat.count({
        where: { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      }),
      this.prisma.leadChat.findMany({ select: { temas: true, prefs: true } }),
    ]);
    const cuentaTemas = new Map<string, number>();
    const cuentaTipos = new Map<string, number>();
    for (const l of todos) {
      for (const t of l.temas || []) cuentaTemas.set(t, (cuentaTemas.get(t) || 0) + 1);
      const tipo = (l.prefs as any)?.tipo;
      if (tipo) cuentaTipos.set(tipo, (cuentaTipos.get(tipo) || 0) + 1);
    }
    const top = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([tema, total]) => ({ tema, total }));
    return {
      total,
      conNombre,
      conContacto,
      mensajesTotal: mensajes._sum.mensajesTotal || 0,
      activos7d: ultimos,
      topTemas: top(cuentaTemas),
      topTipos: top(cuentaTipos),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar interesados (búsqueda por nombre/email)' })
  async listar(
    @Query('q') q?: string,
    @Query('conNombre') conNombre?: string,
    @Query('take') take?: string,
  ) {
    return this.prisma.leadChat.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { nombre: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { ultimaPregunta: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(conNombre === 'si' ? { nombre: { not: null } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.max(1, Math.min(200, parseInt(take || '100', 10) || 100)),
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        ip: true,
        mensajesTotal: true,
        primeraPregunta: true,
        ultimaPregunta: true,
        prefs: true,
        temas: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle con transcripción' })
  async detalle(@Param('id') id: string) {
    return this.prisma.leadChat.findUnique({ where: { id } });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar interesado (habeas data)' })
  async eliminar(@Param('id') id: string) {
    return this.prisma.leadChat.delete({ where: { id } });
  }
}
