import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { RepoService } from './repo.service';

class PublicarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  mensaje: string;

  @IsOptional()
  @IsString()
  token?: string;
}

@ApiTags('Repo - publicar cambios')
@Controller('admin/repo')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class RepoController {
  constructor(private repo: RepoService) {}

  @Get('estado')
  @ApiOperation({ summary: 'Rama, cambios pendientes y últimos commits' })
  estado() {
    return this.repo.estado();
  }

  @Post('publicar')
  @ApiOperation({ summary: 'git add + commit + push a origin (token opcional, no se guarda)' })
  publicar(@Body() dto: PublicarDto) {
    return this.repo.publicar(dto.mensaje, dto.token);
  }
}
