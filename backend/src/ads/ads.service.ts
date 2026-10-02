import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService) {}

  async getActiveAds(placement?: string) {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const where: Prisma.AdvertisementWhereInput = {
      activo: true,
      fechaInicio: { lte: todayEnd },
      fechaFin: { gte: todayStart },
    };
    if (placement) where.placement = placement as any;

    return this.prisma.advertisement.findMany({
      where,
      orderBy: [{ pagoTotal: 'desc' }, { prioridad: 'desc' }, { createdAt: 'desc' }],
      include: { sponsor: true },
    });
  }

  async getActiveAd(placement: string) {
    const ads = await this.getActiveAds(placement);
    return ads[0] || null;
  }

  async trackImpression(id: string) {
    return this.prisma.advertisement.update({
      where: { id },
      data: { impresiones: { increment: 1 } },
    });
  }

  async trackClick(id: string) {
    return this.prisma.advertisement.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });
  }

  // Admin CRUD
  async findAllSponsors() {
    return this.prisma.sponsor.findMany({
      include: { anuncios: true, sponsoredListings: true },
    });
  }

  async createSponsor(data: Prisma.SponsorCreateInput) {
    return this.prisma.sponsor.create({ data });
  }

  async updateSponsor(id: string, data: Prisma.SponsorUpdateInput) {
    return this.prisma.sponsor.update({ where: { id }, data });
  }

  async removeSponsor(id: string) {
    return this.prisma.sponsor.delete({ where: { id } });
  }

  async findAllAds() {
    return this.prisma.advertisement.findMany({
      include: { sponsor: true },
      orderBy: [{ pagoTotal: 'desc' }, { prioridad: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAd(data: Prisma.AdvertisementCreateInput) {
    return this.prisma.advertisement.create({ data });
  }

  async updateAd(id: string, data: Prisma.AdvertisementUpdateInput) {
    return this.prisma.advertisement.update({ where: { id }, data });
  }

  async removeAd(id: string) {
    return this.prisma.advertisement.delete({ where: { id } });
  }

  async findAllSponsoredListings() {
    return this.prisma.sponsoredListing.findMany({
      include: { sponsor: true, propiedad: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSponsoredListing(data: Prisma.SponsoredListingCreateInput) {
    return this.prisma.sponsoredListing.create({ data });
  }

  async removeSponsoredListing(id: string) {
    return this.prisma.sponsoredListing.delete({ where: { id } });
  }
}
