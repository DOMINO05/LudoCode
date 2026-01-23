import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CodeRunnerService } from '../code-runner/code-runner.service';

// Use require to avoid missing type definition issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = require('node-pty');

@Injectable()
export class TerminalService {
  private readonly logger = new Logger(TerminalService.name);
  private sessions = new Map<string, { process: any; dir: string }>();

  constructor(private readonly codeRunnerService: CodeRunnerService) {}

  async startSession(
    socketId: string,
    language: string,
    code: string,
    onData: (data: string) => void,
    onExit: (code: number) => void,
  ) {
    const uniqueDir = path.join(os.tmpdir(), 'ludocode_sessions', socketId);
    if (!fs.existsSync(uniqueDir)) {
      fs.mkdirSync(uniqueDir, { recursive: true });
    }

    try {
      let { fileName, commandString, requiredBinary } = this.prepareCommand(
        language,
        uniqueDir,
      );

      // Check if the required binary exists
      if (requiredBinary) {
        let binaryPath = requiredBinary;
        let found = false;

        try {
          const checkCmd =
            os.platform() === 'win32'
              ? `where ${requiredBinary}`
              : `which ${requiredBinary}`;
          require('child_process').execSync(checkCmd, { stdio: 'ignore' });
          found = true;
        } catch (e) {
          // Not in path, try common installation directories on Windows
          if (os.platform() === 'win32') {
            const commonPaths = [
              'C:\\Program Files\\Microsoft\\jdk-17.0.17.10-hotspot\\bin',
              'C:\\Program Files\\Java\\jdk-17\\bin',
              'C:\\Program Files\\Java\\jdk1.8.0_401\\bin',
              'C:\\MinGW\\bin',
              'C:\\msys64\\mingw64\\bin',
            ];

            for (const p of commonPaths) {
              const fullPath = path.join(
                p,
                requiredBinary.endsWith('.exe')
                  ? requiredBinary
                  : `${requiredBinary}.exe`,
              );
              if (fs.existsSync(fullPath)) {
                binaryPath = `"${fullPath}"`;
                found = true;
                break;
              }
            }
          }
        }

        if (found && binaryPath !== requiredBinary) {
          // Update commandString with full path
          // We replace only whole words to avoid partial matches
          commandString = commandString.replace(
            new RegExp(`\\b${requiredBinary}\\b`, 'g'),
            binaryPath,
          );
          
          // Special handling for Java to ensure 'java' runner also uses the same JDK path
          if (language === 'java') {
            const javaPath = binaryPath.replace(/\bjavac(\.exe)?\b/i, 'java$1');
            // Only replace 'java' if it's a standalone word and NOT preceded by a dot
            // (to avoid matching Main.java)
            commandString = commandString.replace(/(?<!\.)\bjava\b/g, javaPath);
          }

          // On Windows, if binaryPath contains spaces and we are using PowerShell, 
          // we need to use the call operator '&'
          if (os.platform() === 'win32' && binaryPath.includes(' ')) {
              commandString = commandString.replace(new RegExp(`^${binaryPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), `& ${binaryPath}`);
              if (language === 'java') {
                  const javaPath = binaryPath.replace(/\bjavac(\.exe)?\b/i, 'java$1');
                  commandString = commandString.replace(new RegExp(`& ${javaPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), `& ${javaPath}`); // avoid double &
                  commandString = commandString.replace(new RegExp(`(?<!& )${javaPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), `& ${javaPath}`);
              }
          }
        }

        if (!found) {
          // Binary not found locally, try Piston for languages it supports
          if (language !== 'sql') {
            onData(
              `\r\n\x1b[33mFIGYELEM: A(z) '${requiredBinary}' nincs telepítve a szerveren.\x1b[0m\r\n`,
            );
            onData(
              `\x1b[34mÁtváltás felhő alapú futtatásra (Piston API)...\x1b[0m\r\n`,
            );
            onData(
              `\x1b[90mMegjegyzés: A felhő alapú futtatás nem támogatja az interaktív bevitelt (pl. scanf, input).\x1b[0m\r\n\r\n`,
            );
            try {
              const result = await this.codeRunnerService.executeCode(
                language,
                code,
              );
              onData(result.output);
              if (!result.output.endsWith('\n')) onData('\r\n');
              onExit(0);
              return;
            } catch (pistonErr) {
              onData(
                `\r\n\x1b[31mHIBA: A felhő alapú futtatás is sikertelen.\x1b[0m\r\n`,
              );
            }
          }

          const installInstructions = {
            javac:
              'A Java futtatásához JDK (Java Development Kit) telepítése szükséges. Töltsd le innen: https://www.oracle.com/java/technologies/downloads/',
            'g++':
              'A C++ futtatásához G++ fordító szükséges (pl. MinGW Windows-ra).',
            sqlite3:
              'Az SQL futtatásához SQLite3 CLI szükséges. Töltsd le innen: https://www.sqlite.org/download.html',
            python: 'A Python nem található a rendszerben. Kérlek telepítsd!',
            node: 'A Node.js nem található a rendszerben.',
          };

          onData(
            `\r\n\x1b[31mHIBA: A(z) '${requiredBinary}' nem található!\x1b[0m\r\n`,
          );
          onData(
            `${installInstructions[requiredBinary] || 'Kérlek telepítsd a szükséges eszközöket.'}\r\n`,
          );
          onExit(1);
          return;
        }
      }

      // Write the code to the file
      fs.writeFileSync(path.join(uniqueDir, fileName), code);

      const isWin = os.platform() === 'win32';
      const shell = isWin ? 'powershell.exe' : 'bash';

      // Strategy: Create a temporary script file to run the command.
      // This is much more robust for interactive input handling in PTYs.
      const scriptName = isWin ? 'ludocode_run.ps1' : 'ludocode_run.sh';
      const scriptPath = path.join(uniqueDir, scriptName);
      fs.writeFileSync(scriptPath, commandString);

      let shellArgs = [];
      if (isWin) {
        // Use -File to execute the script in PowerShell
        shellArgs = [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          scriptPath,
        ];
      } else {
        // Ensure script is executable on Linux/Mac
        fs.chmodSync(scriptPath, '755');
        shellArgs = [scriptPath];
      }

      // Add placeholder to avoid race condition with input events
      this.sessions.set(socketId, { process: null, dir: uniqueDir });

      const ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: uniqueDir,
        env: { ...process.env, LANG: 'en_US.UTF-8' },
      });

      this.sessions.get(socketId).process = ptyProcess;

      ptyProcess.onData((data) => onData(data));

      ptyProcess.onExit(({ exitCode }) => {
        onExit(exitCode);
        this.cleanup(socketId);
      });
    } catch (e) {
      onData(`System Error: ${e.message}\r\n`);
      onExit(1);
    }
  }

  private prepareCommand(
    language: string,
    dir: string,
  ): { fileName: string; commandString: string; requiredBinary?: string } {
    const isWin = os.platform() === 'win32';

    switch (language) {
      case 'python': {
        // Try to find the correct python binary
        let pyBin = 'python';
        try {
          const check = isWin ? 'where python' : 'command -v python3';
          require('child_process').execSync(check, { stdio: 'ignore' });
          if (!isWin) pyBin = 'python3';
        } catch (e) {
          pyBin = 'python';
        }

        return {
          fileName: 'main.py',
          commandString: `${pyBin} -u main.py`,
          requiredBinary: pyBin,
        };
      }
      case 'javascript':
        return {
          fileName: 'main.js',
          commandString: 'node main.js',
          requiredBinary: 'node',
        };
      case 'typescript':
        return {
          fileName: 'main.ts',
          commandString: 'npx ts-node main.ts',
          requiredBinary: isWin ? 'npx.cmd' : 'npx',
        };
      case 'java':
        return {
          fileName: 'Main.java',
          commandString: isWin
            ? 'javac Main.java; if ($?) { java Main }'
            : 'javac Main.java && java Main',
          requiredBinary: 'javac',
        };
      case 'cpp':
        return {
          fileName: 'main.cpp',
          commandString: isWin
            ? 'if (Get-Command g++ -ErrorAction SilentlyContinue) { g++ main.cpp -o main.exe; if ($?) { ./main.exe } } else { clang++ main.cpp -o main.exe; if ($?) { ./main.exe } }'
            : 'if command -v g++ >/dev/null; then g++ main.cpp -o main && ./main; else clang++ main.cpp -o main && ./main; fi',
          requiredBinary: 'g++',
        };
      case 'sql':
        return {
          fileName: 'main.sql',
          // Use pretty formatting for sqlite3
          commandString: isWin
            ? 'Get-Content main.sql -Raw | sqlite3 -header -column'
            : 'cat main.sql | sqlite3 -header -column',
          requiredBinary: 'sqlite3',
        };
      default:
        throw new Error(`Language ${language} not supported`);
    }
  }

  handleInput(socketId: string, input: string) {
    const session = this.sessions.get(socketId);
    if (session && session.process) {
      try {
        // Log input for debugging
        this.logger.debug(`Writing to PTY (${socketId}): ${JSON.stringify(input)}`);

        // On Windows, processes often expect \r\n for line endings.
        // xterm.js sends \r. We transform all \r to \r\n globally.
        let data = input;
        if (os.platform() === 'win32') {
            data = data.replace(/\r/g, '\r\n');
        }
        session.process.write(data);
      } catch (e) {
        this.logger.error(`Failed to write to PTY: ${e.message}`);
      }
    } else if (session) {
      // Session exists but process not yet spawned, buffer input?
      // For now just ignore or log
      this.logger.debug(
        `Input received for session ${socketId} before process spawned`,
      );
    }
  }

  resizeSession(socketId: string, cols: number, rows: number) {
    const session = this.sessions.get(socketId);
    if (session && session.process) {
      try {
        session.process.resize(cols, rows);
      } catch (e) {
        // Ignore
      }
    }
  }

  killSession(socketId: string) {
    this.cleanup(socketId);
  }

  private cleanup(socketId: string) {
    const session = this.sessions.get(socketId);
    if (session) {
      if (session.process) {
        try {
          session.process.kill();
        } catch (e) {}
      }
      // Cleanup session directory and scripts
      try {
        if (fs.existsSync(session.dir)) {
          fs.rmSync(session.dir, { recursive: true, force: true });
        }
      } catch (e) {
        this.logger.error(
          `Failed to cleanup directory ${session.dir}: ${e.message}`,
        );
      }

      this.sessions.delete(socketId);
    }
  }
}
