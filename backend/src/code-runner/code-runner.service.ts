import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface PistonExecuteResponse {
  run: {
    stdout: string;
    stderr: string;
    output: string;
    code: number;
    signal: string | null;
  };
}

@Injectable()
export class CodeRunnerService {
  private readonly logger = new Logger(CodeRunnerService.name);
  private pistonUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.pistonUrl =
      this.configService.get<string>('PISTON_API_URL') ||
      'https://emkc.org/api/v2/piston/execute';
  }

  async executeCode(
    language: string,
    code: string,
  ): Promise<{ stdout: string; stderr: string; output: string }> {
    try {
      const response = await axios.post<PistonExecuteResponse>(this.pistonUrl, {
        language,
        version: '*',
        files: [
          {
            content: code,
          },
        ],
      });

      const { run } = response.data;
      return {
        stdout: run.stdout,
        stderr: run.stderr,
        output: run.output,
      };
    } catch (error) {
      this.logger.error(
        'Piston API Error:',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error('Code execution failed');
    }
  }
}
