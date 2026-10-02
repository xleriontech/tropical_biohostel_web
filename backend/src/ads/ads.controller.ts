import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdsService } from './ads.service';

@ApiTags('Ads')
@Controller()
export class AdsController {
  constructor(private adsService: AdsService) {}

  // Public endpoints
  @Get('ads')
  @ApiOperation({ summary: 'Obtener anuncios activos por ubicación' })
  async getActiveAds(@Query('placement') placement?: string) {
    return this.adsService.getActiveAds(placement);
  }

  @Post('ads/:id/impression')
  @ApiOperation({ summary: 'Registrar impresión de anuncio' })
  async trackImpression(@Param('id') id: string) {
    return this.adsService.trackImpression(id);
  }

  @Post('ads/:id/click')
  @ApiOperation({ summary: 'Registrar click en anuncio' })
  async trackClick(@Param('id') id: string) {
    return this.adsService.trackClick(id);
  }

  // Admin - Sponsors
  @Get('admin/sponsors')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar patrocinadores' })
  async findAllSponsors() {
    return this.adsService.findAllSponsors();
  }

  @Post('admin/sponsors')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear patrocinador' })
  async createSponsor(@Body() body: { nombre: string; logoUrl?: string; sitioWeb?: string; contacto?: string }) {
    return this.adsService.createSponsor(body);
  }

  @Put('admin/sponsors/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar patrocinador' })
  async updateSponsor(@Param('id') id: string, @Body() body: any) {
    return this.adsService.updateSponsor(id, body);
  }

  @Delete('admin/sponsors/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar patrocinador' })
  async removeSponsor(@Param('id') id: string) {
    return this.adsService.removeSponsor(id);
  }

  // Admin - Advertisements
  @Get('admin/advertisements')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar anuncios' })
  async findAllAds() {
    return this.adsService.findAllAds();
  }

  @Post('admin/advertisements')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear anuncio' })
  async createAd(@Body() body: any) {
    return this.adsService.createAd(body);
  }

  @Put('admin/advertisements/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar anuncio' })
  async updateAd(@Param('id') id: string, @Body() body: any) {
    return this.adsService.updateAd(id, body);
  }

  @Delete('admin/advertisements/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar anuncio' })
  async removeAd(@Param('id') id: string) {
    return this.adsService.removeAd(id);
  }

  // Admin - Sponsored Listings
  @Get('admin/sponsored-listings')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar listados patrocinados' })
  async findAllSponsoredListings() {
    return this.adsService.findAllSponsoredListings();
  }

  @Post('admin/sponsored-listings')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear listado patrocinado' })
  async createSponsoredListing(@Body() body: any) {
    return this.adsService.createSponsoredListing(body);
  }

  @Delete('admin/sponsored-listings/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar listado patrocinado' })
  async removeSponsoredListing(@Param('id') id: string) {
    return this.adsService.removeSponsoredListing(id);
  }
}
