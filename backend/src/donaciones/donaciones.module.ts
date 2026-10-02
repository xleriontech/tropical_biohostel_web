import { Module } from '@nestjs/common';
import { DonacionesService } from './donaciones.service';
import { DonacionesController, DonacionesAdminController } from './donaciones.controller';
import { IntegracionesModule } from '../integraciones/integraciones.module';

@Module({
  imports: [IntegracionesModule],
  providers: [DonacionesService],
  controllers: [DonacionesController, DonacionesAdminController],
  exports: [DonacionesService],
})
export class DonacionesModule {}
