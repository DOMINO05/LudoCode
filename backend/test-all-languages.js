const pty = require('node-pty');
const fs = require('fs');
const os = require('os');
const path = require('path');

const language = process.argv[2] || 'python';

const testFiles = {
    python: {
        name: 'test.py',
        content: `print("Python Interaction Test")\nname = input("Enter your name: ")\nprint(f"Hello, {name}!")\n`,
        cmd: 'python -u test.py'
    },
    javascript: {
        name: 'test.js',
        content: `const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });\nconsole.log("JS Interaction Test");\nreadline.question('Enter your name: ', name => {\n  console.log(\`Hello, \${name}!\`);\n  readline.close();\n});\n`,
        cmd: 'node test.js'
    },
    typescript: {
        name: 'test.ts',
        content: `const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });\nconsole.log("TS Interaction Test");\nreadline.question('Enter your name: ', (name: string) => {\n  console.log(\`Hello, \${name}!\`);\n  readline.close();\n});\n`,
        cmd: 'npx ts-node test.ts'
    },
    java: {
        name: 'Main.java',
        content: `import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Java Interaction Test");\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Enter your name: ");\n        String name = sc.nextLine();\n        System.out.println("Hello, " + name + "!");\n    }\n}\n`,
        cmd: os.platform() === 'win32' ? 'javac Main.java; if ($?) { java Main }' : 'javac Main.java && java Main'
    },
    cpp: {
        name: 'test.cpp',
        content: `#include <iostream>\n#include <string>\nint main() {\n    std::cout << "C++ Interaction Test" << std::endl;\n    std::cout << "Enter your name: ";\n    std::string name;\n    std::getline(std::cin, name);\n    std::cout << "Hello, " << name << "!" << std::endl;\n    return 0;\n}\n`,
        cmd: os.platform() === 'win32' ? 'g++ test.cpp -o test.exe; if ($?) { ./test.exe }' : 'g++ test.cpp -o test && ./test'
    },
    sql: {
        name: 'test.sql',
        content: `.header on\n.mode column\nCREATE TABLE test (name TEXT);\nINSERT INTO test VALUES ('LudoCode');\nSELECT * FROM test;\n`,
        cmd: 'sqlite3'
    }
};

if (!testFiles[language]) {
    console.error(`Unsupported language: ${language}`);
    process.exit(1);
}

const config = testFiles[language];
const testDir = path.join(__dirname, 'test_sessions', language);

if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
}

fs.writeFileSync(path.join(testDir, config.name), config.content);

console.log(`\n--- Testing ${language.toUpperCase()} ---`);
console.log(`Directory: ${testDir}`);
console.log(`Command: ${config.cmd}\n`);

const isWin = os.platform() === 'win32';
const shell = isWin ? 'powershell.exe' : 'bash';

const scriptName = isWin ? 'run.ps1' : 'run.sh';
const scriptPath = path.join(testDir, scriptName);
fs.writeFileSync(scriptPath, config.cmd);

const shellArgs = isWin 
    ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]
    : [scriptPath];

let ptyProcess;
let env = { ...process.env };

try {
    // Check if required binary exists or use specific path
    if (config.cmd.includes('javac')) {
        try {
            require('child_process').execSync(isWin ? 'where javac' : 'command -v javac', { stdio: 'ignore' });
        } catch (e) {
            const jdkBin = 'C:\\Program Files\\Microsoft\\jdk-17.0.17.10-hotspot\\bin';
            if (isWin && fs.existsSync(path.join(jdkBin, 'javac.exe'))) {
                env.Path = `${jdkBin};${env.Path}`;
                // Also update the command string to use absolute paths to be safe, 
                // but avoid replacing .java
                const javacPath = `"${path.join(jdkBin, 'javac.exe')}"`;
                const javaPath = `"${path.join(jdkBin, 'java.exe')}"`;
                config.cmd = config.cmd.replace(/\bjavac\b/g, javacPath);
                config.cmd = config.cmd.replace(/(?<!\.)\bjava\b/g, javaPath);
                
                // Add Call Operator '&' for PowerShell if path has spaces
                if (javacPath.includes(' ')) {
                    config.cmd = config.cmd.replace(new RegExp(`^${javacPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), `& ${javacPath}`);
                    config.cmd = config.cmd.replace(new RegExp(`(?<!& )${javaPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), `& ${javaPath}`);
                }

                // Update the script file content too
                fs.writeFileSync(scriptPath, config.cmd);
            } else {
                throw e;
            }
        }
    }

    ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: testDir,
        env: env
    });
} catch (e) {
    console.log(`\x1b[33mFIGYELEM: A(z) ${language} környezet nincs telepítve. Szimulációs mód indítása...\x1b[0m`);
    
    const simScript = `
        console.log("${language.toUpperCase()} Szimuláció (Interaktív)");
        process.stdout.write("Enter your name: ");
        process.stdin.on('data', data => {
            const name = data.toString().trim();
            console.log("Hello, " + name + "! (Szimulált válasz)");
            process.exit(0);
        });
    `;
    const simPath = path.join(testDir, 'sim.js');
    fs.writeFileSync(simPath, simScript);
    
    ptyProcess = pty.spawn(process.execPath, [simPath], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: testDir,
        env: process.env
    });
}

ptyProcess.onData(data => {
    process.stdout.write(data);
});

ptyProcess.onExit(({ exitCode }) => {
    console.log(`\n\n--- Process exited with code ${exitCode} ---`);
    process.exit(0);
});

if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}
process.stdin.on('data', data => {
    if (data[0] === 0x03) {
        ptyProcess.kill();
        process.exit(0);
    }
    ptyProcess.write(data);
});
