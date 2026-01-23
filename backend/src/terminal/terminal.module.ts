import { Module } from '@nestjs/common';
import { TerminalGateway } from './terminal.gateway';
import { TerminalService } from './terminal.service';
import { CodeRunnerModule } from '../code-runner/code-runner.module';

@Module({
  imports: [CodeRunnerModule],
  providers: [TerminalGateway, TerminalService],
})
export class TerminalModule {}
