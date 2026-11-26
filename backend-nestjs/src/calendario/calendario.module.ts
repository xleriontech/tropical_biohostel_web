import { Module } from '@nestjs/common';
import { CalendarioService } from './calendario.service';
import { CalendarioController } from './calendario.controller';

@Module({
  providers: [CalendarioService],
  controllers: [CalendarioController],
  exports: [CalendarioService],
})
export class CalendarioModule {}
