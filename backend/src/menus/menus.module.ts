import { Module } from '@nestjs/common';
import { MenusService } from './menus.service';
import { MenusController, MenusAdminController } from './menus.controller';
import { RagModule } from '../rag/rag.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [RagModule, UploadModule],
  providers: [MenusService],
  controllers: [MenusController, MenusAdminController],
  exports: [MenusService],
})
export class MenusModule {}
