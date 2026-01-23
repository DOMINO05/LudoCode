import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnippetsController } from './snippets.controller';
import { SnippetsService } from './snippets.service';
import { FormatService } from './format.service';
import { SharedSnippet } from './snippet.entity';
import { CodeRunnerModule } from '../code-runner/code-runner.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SharedSnippet]),
    CodeRunnerModule
  ],
  controllers: [SnippetsController],
  providers: [SnippetsService, FormatService],
})
export class SnippetsModule {}
