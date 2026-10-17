import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { LeadController } from './lead.controller';
import { AiModule } from '../ai/ai.module';
import { RedisModule } from '../redis/redis.module';
import { RagModule } from '../rag/rag.module';
import { MenusModule } from '../menus/menus.module';

@Module({
  imports: [AiModule, RedisModule, RagModule, MenusModule],
  providers: [ChatService],
  controllers: [ChatController, LeadController],
})
export class ChatModule {}
