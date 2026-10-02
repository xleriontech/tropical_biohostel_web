import { Module } from '@nestjs/common';
import { IntegracionesService } from './integraciones.service';
import { IntegracionesController } from './integraciones.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [IntegracionesService],
  controllers: [IntegracionesController],
  exports: [IntegracionesService],
})
export class IntegracionesModule {}
