import { Controller, Get, Post, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(
    private reviewsService: ReviewsService,
    private prisma: PrismaService,
  ) {}

  @Get('properties/:slug/reviews')
  @ApiOperation({ summary: 'Obtener reseñas de una propiedad' })
  async findByProperty(@Param('slug') slug: string) {
    const property = await this.prisma.propiedad.findUnique({ where: { slug } });
    if (!property) throw new NotFoundException('Propiedad no encontrada');
    return this.reviewsService.findByProperty(property.id);
  }

  @Post('properties/:slug/reviews')
  @ApiOperation({ summary: 'Crear reseña para una propiedad' })
  async create(
    @Param('slug') slug: string,
    @Body() body: { autorNombre: string; autorEmail?: string; calificacion: number; comentario?: string },
  ) {
    const property = await this.prisma.propiedad.findUnique({ where: { slug } });
    if (!property) throw new NotFoundException('Propiedad no encontrada');
    return this.reviewsService.create({ ...body, propiedadId: property.id });
  }

  @Get('reviews/top-rated')
  @ApiOperation({ summary: 'Propiedades mejor calificadas' })
  async getTopRated(@Query('limit') limit?: string) {
    return this.reviewsService.getTopRated(limit ? parseInt(limit, 10) : 6);
  }
}
