import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { VerificacionService } from './verificacion.service';
import { AiModule } from '../ai/ai.module';
import { IntegracionesModule } from '../integraciones/integraciones.module';

@Module({
  imports: [AiModule, IntegracionesModule],
  providers: [IngestionService, VerificacionService],
  controllers: [IngestionController],
  exports: [IngestionService],
})
export class IngestionModule {}
