import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@ApiTags('Config')
@Controller('config')
export class ConfigController {
  constructor(private prisma: PrismaService) {}

  @Get(':key')
  @ApiOperation({ summary: 'Obtener config por clave (público)' })
  async getConfig(@Param('key') key: string) {
    const config = await this.prisma.siteConfig.findUnique({ where: { key } });
    if (!config) return {};
    return config.value;
  }

  @Put(':key')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar config por clave (admin)' })
  async updateConfig(@Param('key') key: string, @Body() body: Record<string, any>) {
    const config = await this.prisma.siteConfig.upsert({
      where: { key },
      update: { value: body as unknown as Prisma.InputJsonValue },
      create: { key, value: body as unknown as Prisma.InputJsonValue },
    });
    return config.value;
  }
}
