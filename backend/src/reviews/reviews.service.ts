import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findByProperty(propiedadId: string) {
    return this.prisma.review.findMany({
      where: { propiedadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { propiedadId: string; autorNombre: string; autorEmail?: string; calificacion: number; comentario?: string }) {
    return this.prisma.review.create({ data });
  }

  async getTopRated(limit = 6) {
    const properties = await this.prisma.propiedad.findMany({
      where: { estado: 'PUBLICADO', reviews: { some: {} } },
      include: {
        reviews: { orderBy: { createdAt: 'desc' }, take: 3 },
        images: { where: { esPrincipal: true }, take: 1 },
      },
    });

    const withAvg = properties
      .map((p) => {
        const avg = p.reviews.reduce((s, r) => s + r.calificacion, 0) / p.reviews.length;
        return { ...p, ratingPromedio: Math.round(avg * 10) / 10, totalReviews: p.reviews.length };
      })
      .sort((a, b) => b.ratingPromedio - a.ratingPromedio)
      .slice(0, limit);

    return withAvg;
  }
}
