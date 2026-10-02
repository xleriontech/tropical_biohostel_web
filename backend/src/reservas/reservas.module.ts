import { Module } from '@nestjs/common';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { CalendarioModule } from '../calendario/calendario.module';

@Module({
  imports: [PrismaModule, NotificacionesModule, CalendarioModule],
  controllers: [ReservasController],
  providers: [ReservasService],
})
export class ReservasModule {}
