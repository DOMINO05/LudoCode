/**
 * Utility to run code using the Piston API and validate test cases.
 */

const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';

export async function runCodeWithPiston(language, sourceCode) {
  try {
    const response = await fetch(PISTON_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: language,
        version: '*',
        files: [{ content: sourceCode }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Piston API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.run; // Returns { stdout, stderr, code, signal, output }
  } catch (error) {
    console.error('Error running code:', error);
    return { stderr: error.message, stdout: '', output: error.message };
  }
}

export async function validateTestCases(language, userCode, testCases) {
  if (!testCases || testCases.length === 0) {
    const result = await runCodeWithPiston(language, userCode);
    return {
      isCorrect: result.stderr === '' && result.code === 0,
      output: result.stderr || result.stdout,
    };
  }

  for (const testCase of testCases) {
    let codeToRun = userCode;

    if (language === 'python') {
      const match = userCode.match(/def\s+(\w+)\s*\(/);
      if (match) {
        const funcName = match[1];
        const input = testCase.input;
        codeToRun += `\nprint(${funcName}(${input}))`;
      }
    } else if (language === 'java') {
      if (!userCode.includes('class ')) {
        const match = userCode.match(
          /(?:public|private|protected)?\s*(?:static\s+)?[\w<>\[\]]+\s+(\w+)\s*\(/,
        );
        if (match) {
          const funcName = match[1];
          let input = String(testCase.input);

          // Convert Python-style list [1, 2] to Java-style new int[]{1, 2}.
          if (input.includes('[[')) {
            input = input.replace(/\[\[/g, 'new int[][]{{')
              .replace(/\]\s*,\s*\[/g, '}, {')
              .replace(/\]\]/g, '}}');
          } else {
            input = input.replace(/\[(.*?)\]/g, 'new int[]{$1}');
          }

          if (typeof testCase.input === 'string' && testCase.input.startsWith("'") && testCase.input.endsWith("'")) {
            input = `"${testCase.input.slice(1, -1)}"`;
          }

          codeToRun = `
import java.util.Arrays;
public class Main {
    ${userCode}

    public static void main(String[] args) {
        Main obj = new Main();
        Object result = obj.${funcName}(${input});
        if (result instanceof int[]) {
            System.out.println(Arrays.toString((int[])result));
        } else if (result instanceof double[]) {
            System.out.println(Arrays.toString((double[])result));
        } else if (result instanceof Object[]) {
            System.out.println(Arrays.deepToString((Object[])result));
        } else if (result instanceof char[]) {
            System.out.println(Arrays.toString((char[])result));
        } else if (result instanceof boolean[]) {
            System.out.println(Arrays.toString((boolean[])result));
        } else {
            System.out.println(result);
        }
    }
}`;
        } else {
          let printStmt = '';
          if (userCode.includes('int sum') || userCode.includes('sum =')) {
            printStmt = 'System.out.println(sum);';
          }
          codeToRun = `
public class Main {
    public static void main(String[] args) {
        ${userCode}
        ${printStmt}
    }
}`;
        }
      }
    }

    const result = await runCodeWithPiston(language, codeToRun);

    if (result.stderr) {
      return { isCorrect: false, output: result.stderr };
    }

    const expected = String(testCase.expected_output)
      .replace(/'/g, '')
      .trim();
    const actual = result.stdout.trim().replace(/'/g, '');

    if (actual !== expected) {
      return {
        isCorrect: false,
        output: `Expected: ${expected}, Got: ${actual}`,
      };
    }
  }

  return { isCorrect: true, output: 'All tests passed' };
}