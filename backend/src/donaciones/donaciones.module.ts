import { Module } from '@nestjs/common';
import { DonacionesService } from './donaciones.service';
import { SiembraService } from './siembra.service';
import { DonacionesController, DonacionesAdminController } from './donaciones.controller';
import { IntegracionesModule } from '../integraciones/integraciones.module';

@Module({
  imports: [IntegracionesModule],
  providers: [DonacionesService, SiembraService],
  controllers: [DonacionesController, DonacionesAdminController],
  exports: [DonacionesService, SiembraService],
})
export class DonacionesModule {}
