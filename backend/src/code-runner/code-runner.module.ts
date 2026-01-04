import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CodeRunnerService } from './code-runner.service';

@Module({
  imports: [ConfigModule],
  providers: [CodeRunnerService],
  exports: [CodeRunnerService],
})
export class CodeRunnerModule {}
