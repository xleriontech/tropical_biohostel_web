import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { UploadModule } from '../upload/upload.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [UploadModule, PrismaModule],
  providers: [PropertiesService],
  controllers: [PropertiesController],
  exports: [PropertiesService],
})
export class PropertiesModule {}
