import { Module } from '@nestjs/common';
import { RepoService } from './repo.service';
import { RepoController } from './repo.controller';

@Module({
  providers: [RepoService],
  controllers: [RepoController],
  exports: [RepoService],
})
export class RepoModule {}
