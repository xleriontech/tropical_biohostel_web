import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CalendarioService } from '../calendario/calendario.service';
import { CreateReservaDto } from './dto/create-reserva.dto';

@Injectable()
export class ReservasService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
    private calendario: CalendarioService,
  ) {}

  async create(dto: CreateReservaDto, userId: string) {
    const propiedad = await this.prisma.propiedad.findUnique({ where: { id: dto.propiedadId } });
    if (!propiedad) throw new NotFoundException('Propiedad no encontrada');
    if (propiedad.estado !== 'PUBLICADO') throw new BadRequestException('La propiedad no está disponible');

    const fechaLlegada = new Date(dto.fechaLlegada);
    const fechaSalida = new Date(dto.fechaSalida);
    if (fechaSalida <= fechaLlegada) throw new BadRequestException('La fecha de salida debe ser posterior a la de llegada');
    if (fechaLlegada < new Date()) throw new BadRequestException('La fecha de llegada no puede ser en el pasado');

    // Anti doble-reserva: ni nuestras reservas ni Airbnb/Booking (iCal) pueden traslaparse
    const desde = fechaLlegada.toISOString().slice(0, 10);
    const hasta = fechaSalida.toISOString().slice(0, 10);
    const disp = await this.calendario.disponibilidad(dto.propiedadId, desde, hasta);
    if (!disp.disponible && disp.conflictoCon) {
      const c = disp.conflictoCon;
      const donde = c.fuente === 'TROPICAL BIOHOSTEL' ? 'en nuestra plataforma' : `en ${c.fuente}`;
      throw new ConflictException(
        `Esas fechas ya están ocupadas (${c.desde} al ${c.hasta} ${donde}). Elige otras fechas.`,
      );
    }

    const dias = Math.ceil((fechaSalida.getTime() - fechaLlegada.getTime()) / 86400000);
    const total = dias * propiedad.precioNoche;

    const reserva = await this.prisma.reserva.create({
      data: {
        propiedadId: dto.propiedadId,
        userId,
        nombre: dto.nombre,
        email: dto.email,
        telefono: dto.telefono,
        identificacion: dto.identificacion,
        fechaLlegada,
        fechaSalida,
        huespedes: dto.huespedes || 1,
        metodoPago: dto.metodoPago || 'EFECTIVO',
        total,
        notas: dto.notas,
      },
      include: { propiedad: true },
    });

    await this.notificaciones.notifyProvider(propiedad, reserva);
    await this.notificaciones.notifyAdmin(reserva);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.notificaciones.create({
      userId,
      tipo: 'success',
      titulo: 'Reserva confirmada',
      mensaje: `Tu reserva en ${propiedad.nombre} del ${fechaLlegada.toLocaleDateString()} al ${fechaSalida.toLocaleDateString()} fue creada exitosamente. Total: $${total.toLocaleString()}`,
    });

    return reserva;
  }

  async findAll(filtros?: { propiedadId?: string; email?: string; estado?: string }) {
    const where: any = {};
    if (filtros?.propiedadId) where.propiedadId = filtros.propiedadId;
    if (filtros?.email) where.email = filtros.email;
    if (filtros?.estado) where.estado = filtros.estado;
    return this.prisma.reserva.findMany({
      where,
      include: { propiedad: { select: { nombre: true, slug: true, telefono: true, email: true, whatsapp: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      include: { propiedad: { select: { nombre: true, slug: true, telefono: true, email: true, whatsapp: true } } },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    return reserva;
  }

  async cancelar(id: string) {
    const reserva = await this.prisma.reserva.findUnique({ where: { id } });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    if (reserva.estado !== 'PENDIENTE') throw new BadRequestException('Solo se pueden cancelar reservas pendientes');
    return this.prisma.reserva.update({ where: { id }, data: { estado: 'CANCELADA' } });
  }

  async confirmarNoShow(id: string) {
    const reserva = await this.prisma.reserva.findUnique({ where: { id }, include: { user: true } });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    const updated = await this.prisma.reserva.update({ where: { id }, data: { estado: 'NO_SHOW' } });
    if (reserva.user) {
      const banHasta = new Date();
      banHasta.setMonth(banHasta.getMonth() + 1);
      await this.prisma.user.update({
        where: { id: reserva.user.id },
        data: { bannedUntil: banHasta },
      });
    }
    return updated;
  }
}
