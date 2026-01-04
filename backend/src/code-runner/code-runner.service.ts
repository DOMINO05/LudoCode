import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CodeRunnerService {
  private pistonUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.pistonUrl = this.configService.get<string>('PISTON_API_URL') || 'https://emkc.org/api/v2/piston/execute';
  }

  async executeCode(language: string, code: string): Promise<{ stdout: string; stderr: string; output: string }> {
    try {
      const response = await axios.post(this.pistonUrl, {
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
      console.error('Piston API Error:', error.message);
      throw new Error('Code execution failed');
    }
  }
}
