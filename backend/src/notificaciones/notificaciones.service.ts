import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacionesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: {
    userId: string;
    tipo?: string;
    titulo: string;
    mensaje: string;
    link?: string;
  }) {
    return this.prisma.notificacion.create({
      data: {
        userId: dto.userId,
        tipo: dto.tipo || 'info',
        titulo: dto.titulo,
        mensaje: dto.mensaje,
        link: dto.link,
      },
    });
  }

  async findByUser(userId: string, soloNoLeidas = false) {
    const where: any = { userId };
    if (soloNoLeidas) where.leida = false;
    return this.prisma.notificacion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsLeida(id: string, userId: string) {
    return this.prisma.notificacion.updateMany({
      where: { id, userId },
      data: { leida: true },
    });
  }

  async markAllAsLeidas(userId: string) {
    return this.prisma.notificacion.updateMany({
      where: { userId, leida: false },
      data: { leida: true },
    });
  }

  async countNoLeidas(userId: string) {
    return this.prisma.notificacion.count({ where: { userId, leida: false } });
  }

  async notifyProvider(propiedad: any, reserva: any) {
    if (!propiedad.ownerId) return;
    const mensaje = `Nueva reserva en ${propiedad.nombre}: ${reserva.nombre} — ${reserva.huespedes} huésped(es), ${reserva.fechaLlegada.toLocaleDateString()} a ${reserva.fechaSalida.toLocaleDateString()}`;
    await this.create({
      userId: propiedad.ownerId,
      tipo: 'success',
      titulo: 'Nueva reserva recibida',
      mensaje,
    });
    const whatsappLink = propiedad.whatsapp
      ? `https://wa.me/${propiedad.whatsapp}?text=${encodeURIComponent(`📋 *Nueva reserva en ${propiedad.nombre}*\n👤 ${reserva.nombre}\n📧 ${reserva.email}\n📞 ${reserva.telefono}\n🆔 ${reserva.identificacion}\n📅 Llegada: ${reserva.fechaLlegada.toLocaleDateString()}\n📅 Salida: ${reserva.fechaSalida.toLocaleDateString()}\n👥 ${reserva.huespedes} huésped(es)\n💳 Pago: ${reserva.metodoPago}\n💰 Total: $${reserva.total?.toLocaleString()}`)}`
      : null;
    const emailLink = propiedad.email
      ? `mailto:${propiedad.email}?subject=${encodeURIComponent(`Nueva reserva - ${propiedad.nombre}`)}&body=${encodeURIComponent(`Nueva reserva en ${propiedad.nombre}:\n\nNombre: ${reserva.nombre}\nEmail: ${reserva.email}\nTeléfono: ${reserva.telefono}\nIdentificación: ${reserva.identificacion}\nLlegada: ${reserva.fechaLlegada.toLocaleDateString()}\nSalida: ${reserva.fechaSalida.toLocaleDateString()}\nHuéspedes: ${reserva.huespedes}\nPago: ${reserva.metodoPago}\nTotal: $${reserva.total?.toLocaleString()}`)}`
      : null;
    if (whatsappLink) {
      await this.create({
        userId: propiedad.ownerId,
        tipo: 'info',
        titulo: 'Enviar notificación por WhatsApp',
        mensaje: `Haz clic para notificar al proveedor por WhatsApp`,
        link: whatsappLink,
      });
    }
    if (emailLink) {
      await this.create({
        userId: propiedad.ownerId,
        tipo: 'info',
        titulo: 'Enviar notificación por Email',
        mensaje: `Haz clic para notificar al proveedor por correo`,
        link: emailLink,
      });
    }
  }

  async notifyAdmin(reserva: any) {
    const admin = await this.prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) return;
    const mensaje = `Nueva reserva de ${reserva.nombre} en ${reserva.propiedad?.nombre || '—'}`;
    await this.create({
      userId: admin.id,
      tipo: 'success',
      titulo: 'Nueva reserva registrada',
      mensaje,
      link: `/admin/reservas`,
    });
  }
}
