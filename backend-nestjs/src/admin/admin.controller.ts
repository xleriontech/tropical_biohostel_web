import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Datos del dashboard admin' })
  async getDashboard() {
    const [
      totalPropiedades,
      publicadas,
      borradores,
      sponsors,
      anuncios,
      usuarios,
      ingresosPotenciales,
      propiedadesPorTipo,
    ] = await Promise.all([
      this.prisma.propiedad.count(),
      this.prisma.propiedad.count({ where: { estado: 'PUBLICADO' } }),
      this.prisma.propiedad.count({ where: { estado: 'BORRADOR' } }),
      this.prisma.sponsor.count(),
      this.prisma.advertisement.count({ where: { activo: true } }),
      this.prisma.user.count(),
      this.prisma.propiedad.aggregate({
        _sum: { precioNoche: true },
        where: { estado: 'PUBLICADO' },
      }),
      this.prisma.propiedad.groupBy({
        by: ['tipo'],
        _count: true,
      }),
    ]);

    return {
      totalPropiedades,
      propiedadesPublicadas: publicadas,
      propiedadesBorrador: borradores,
      totalSponsors: sponsors,
      anunciosActivos: anuncios,
      totalUsuarios: usuarios,
      ingresosPotenciales: ingresosPotenciales._sum.precioNoche || 0,
      propiedadesPorTipo: propiedadesPorTipo.map((p) => ({
        tipo: p.tipo,
        total: p._count,
      })),
    };
  }
}
