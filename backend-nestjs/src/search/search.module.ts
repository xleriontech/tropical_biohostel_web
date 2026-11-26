import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SmartSearchService } from './smart-search.service';
import { SmartSearchController } from './smart-search.controller';
import { BuscadorAncestralController } from './buscador-ancestral.controller';
import { AiModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [AiModule, RagModule],
  providers: [SearchService, SmartSearchService],
  controllers: [SearchController, SmartSearchController, BuscadorAncestralController],
})
export class SearchModule {}
