import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';

@ApiTags('AI Providers')
@Controller('admin/ai-providers')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AiController {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar proveedores de IA' })
  async findAll() {
    return this.prisma.aIProvider.findMany({
      include: { apiKeys: { select: { id: true, isActive: true, createdAt: true } } },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Crear proveedor de IA' })
  async create(
    @Body() body: { name: string; apiEndpoint: string; websiteUrl: string },
  ) {
    return this.prisma.aIProvider.create({ data: body });
  }

  @Post('probar')
  @ApiOperation({ summary: 'Probar un proveedor (chat + embeddings). Sin providerId prueba el motor del RAG' })
  async probar(@Body() body: { providerId?: string | null }) {
    return this.aiService.probarProveedor(body?.providerId ?? null);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar proveedor de IA' })
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; apiEndpoint?: string; websiteUrl?: string; isActive?: boolean; paraChat?: boolean },
  ) {
    // Solo un proveedor puede ser el de Nati (chat) a la vez
    if (body.paraChat === true) {
      await this.prisma.aIProvider.updateMany({ data: { paraChat: false } });
    }
    const result = await this.prisma.aIProvider.update({ where: { id }, data: body });
    if (body.isActive !== undefined || body.paraChat !== undefined) {
      await this.aiService.reloadProvider();
      await this.aiService.reloadChatProvider();
    }
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar proveedor de IA' })
  async remove(@Param('id') id: string) {
    return this.prisma.aIProvider.delete({ where: { id } });
  }

  @Post(':id/keys')
  @ApiOperation({ summary: 'Agregar API key a un proveedor' })
  async addKey(
    @Param('id') providerId: string,
    @Body() body: { key: string },
  ) {
    const encrypted = this.aiService.encrypt(body.key.trim());
    const created = await this.prisma.aPIKey.create({
      data: { providerId, key: encrypted },
    });
    await this.aiService.reloadProvider();
    await this.aiService.reloadChatProvider();
    return created;
  }

  @Put('keys/:keyId/toggle')
  @ApiOperation({ summary: 'Activar/desactivar una API key' })
  async toggleKey(@Param('keyId') keyId: string) {
    const key = await this.prisma.aPIKey.findUnique({ where: { id: keyId } });
    if (!key) throw new Error('Key not found');
    const updated = await this.prisma.aPIKey.update({
      where: { id: keyId },
      data: { isActive: !key.isActive },
    });
    await this.aiService.reloadProvider();
    await this.aiService.reloadChatProvider();
    return updated;
  }

  @Delete('keys/:keyId')
  @ApiOperation({ summary: 'Eliminar una API key' })
  async removeKey(@Param('keyId') keyId: string) {
    return this.prisma.aPIKey.delete({ where: { id: keyId } });
  }
}
