import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private chat: ChatService) {}

  @Get('saludo')
  saludo() {
    return this.chat.saludo();
  }

  @Post('mensaje')
  async mensaje(
    @Body() body: { sessionId?: string; mensaje?: string },
    @Req() req: Request,
  ) {
    const texto = (body.mensaje || '').trim().slice(0, 500);
    if (!texto) {
      return {
        reply:
          'Cuéntame qué buscas: hospedaje, dónde comer o qué hacer aquí. 🪷',
        sessionId: body.sessionId || undefined,
        propiedades: [],
        sugerencias: ['Busco hotel', 'Dónde comer', 'Qué hacer'],
      };
    }
    const fwd = (req.headers['x-forwarded-for'] as string) || '';
    const ip = (fwd.split(',')[0] || req.ip || '').trim().slice(0, 60) || null;
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 250) || null;
    return this.chat.responder(body.sessionId, texto, { ip, userAgent });
  }
}
