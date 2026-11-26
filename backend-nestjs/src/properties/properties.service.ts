import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Propiedad, Prisma } from '@prisma/client';

@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    tipo?: string;
    estado?: string;
    search?: string;
    calificacionMin?: number;
  }) {
    const { page = 1, limit = 20, tipo, estado, search, calificacionMin } = params;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.PropiedadWhereInput = {};

    if (tipo) where.tipo = tipo as any;
    if (estado) where.estado = estado as any;
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
        { ubicacion: { contains: search, mode: 'insensitive' } },
      ];
    }

    const includeReviews = calificacionMin !== undefined;

    const [items, total] = await Promise.all([
      this.prisma.propiedad.findMany({
        where,
        include: {
          images: { orderBy: { orden: 'asc' } },
          ...(includeReviews ? { reviews: true } : {}),
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.propiedad.count({ where }),
    ]);

    let filtered = items;
    if (calificacionMin) {
      filtered = items
        .map((p) => {
          if (!p.reviews || p.reviews.length === 0) return null;
          const avg = p.reviews.reduce((s, r) => s + r.calificacion, 0) / p.reviews.length;
          return avg >= calificacionMin ? { ...p, ratingPromedio: Math.round(avg * 10) / 10 } : null;
        })
        .filter(Boolean) as any[];
    }

    return {
      items: filtered,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: includeReviews ? filtered.length : total,
        pages: Math.ceil((includeReviews ? filtered.length : total) / limitNum),
      },
    };
  }

  async findOne(id: string) {
    const property = await this.prisma.propiedad.findUnique({
      where: { id },
      include: {
        images: { orderBy: { orden: 'asc' } },
        certificados: true,
        reviews: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async findBySlug(slug: string) {
    const property = await this.prisma.propiedad.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { orden: 'asc' } },
        certificados: true,
        reviews: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async create(data: Omit<Prisma.PropiedadCreateInput, 'slug'>) {
    const slug = this.generateSlug(data.nombre);
    const property = await this.prisma.propiedad.create({
      data: { ...data, slug },
      include: { images: true, certificados: true },
    });
    await this.redis.invalidatePattern('search:*');
    await this.redis.invalidatePattern('smart:*');
    return property;
  }

  async update(id: string, data: Prisma.PropiedadUpdateInput) {
    const property = await this.prisma.propiedad.update({
      where: { id },
      data,
    });
    await this.redis.invalidatePattern('search:*');
    await this.redis.invalidatePattern('smart:*');
    return property;
  }

  async remove(id: string) {
    await this.prisma.propiedad.update({
      where: { id },
      data: { estado: 'ARCHIVADO' },
    });
    await this.redis.invalidatePattern('search:*');
    await this.redis.invalidatePattern('smart:*');
  }

  async addImage(propiedadId: string, url: string, esPrincipal = false) {
    const maxOrder = await this.prisma.propiedadImage.aggregate({
      where: { propiedadId },
      _max: { orden: true },
    });

    return this.prisma.propiedadImage.create({
      data: {
        propiedadId,
        url,
        esPrincipal,
        orden: (maxOrder._max.orden || 0) + 1,
      },
    });
  }

  async setPrincipalImage(imageId: string) {
    const image = await this.prisma.propiedadImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException('Image not found');

    await this.prisma.propiedadImage.updateMany({
      where: { propiedadId: image.propiedadId },
      data: { esPrincipal: false },
    });

    return this.prisma.propiedadImage.update({
      where: { id: imageId },
      data: { esPrincipal: true },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  }
}
