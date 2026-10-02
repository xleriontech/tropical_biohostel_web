import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { IsString, IsNotEmpty } from 'class-validator';

class SearchDto {
  @IsString()
  @IsNotEmpty()
  query: string;
}

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Post()
  @ApiOperation({ summary: 'Búsqueda inteligente de propiedades' })
  async search(@Body() dto: SearchDto) {
    return this.searchService.search(dto.query);
  }
}
