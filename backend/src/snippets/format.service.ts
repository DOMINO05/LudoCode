import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';

@Injectable()
export class FormatService {
  private readonly logger = new Logger(FormatService.name);

  async formatCode(language: string, code: string): Promise<string> {
    try {
      const prettier = await import('prettier');
      
      let parser = '';
      let plugins = [];

      switch (language) {
        case 'javascript':
        case 'typescript':
          parser = 'typescript';
          break;
        case 'python':
          return this.formatPython(code);
        case 'java':
          parser = 'java';
          plugins = ['prettier-plugin-java'];
          break;
        case 'sql':
          parser = 'postgresql'; // Use postgres dialect
          plugins = ['prettier-plugin-sql'];
          break;
        case 'cpp':
        case 'c':
          return this.formatCpp(code);
        default:
          return code;
      }

      if (parser) {
        // Prettier options
        const options = {
          parser,
          plugins,
          tabWidth: 2,
          printWidth: 80,
        };
        
        return await prettier.format(code, options);
      }
      
      return code;
    } catch (error) {
      this.logger.error(`Formatting failed for ${language}: ${error.message}`);
      // Return original code if formatting fails, instead of crashing user flow?
      // Or throw error to let user know?
      // User expects formatting. If it fails, alert is better.
      throw new InternalServerErrorException('Formatting failed: ' + error.message);
    }
  }

  async formatPython(code: string): Promise<string> {
    const tempFile = path.join(os.tmpdir(), `temp-${Date.now()}.py`);
    
    try {
        fs.writeFileSync(tempFile, code);
        
        return new Promise((resolve, reject) => {
            exec(`python -m autopep8 "${tempFile}"`, (error, stdout, stderr) => {
                try { fs.unlinkSync(tempFile); } catch (e) {}

                if (error) {
                    this.logger.error(`Autopep8 error: ${stderr || error.message}`);
                    reject(new Error(stderr || error.message));
                } else {
                    resolve(stdout);
                }
            });
        });
    } catch (err) {
        throw new Error('Failed to execute autopep8: ' + err.message);
    }
  }

  async formatCpp(code: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clangFormat = require('clang-format');
    const executable = clangFormat.location; // Path to binary

    const tempFile = path.join(os.tmpdir(), `temp-${Date.now()}.cpp`);
    
    try {
        fs.writeFileSync(tempFile, code);
        
        return new Promise((resolve, reject) => {
            exec(`"${executable}" -style=Google "${tempFile}"`, (error, stdout, stderr) => {
                // Cleanup temp file
                try { fs.unlinkSync(tempFile); } catch (e) {}

                if (error) {
                    this.logger.error(`Clang format error: ${stderr || error.message}`);
                    reject(new Error(stderr || error.message));
                } else {
                    resolve(stdout);
                }
            });
        });
    } catch (err) {
        throw new Error('Failed to execute clang-format: ' + err.message);
    }
  }
}
