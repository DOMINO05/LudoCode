import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSubmission } from '../entities/user-submission.entity';
import { Question } from '../entities/question.entity';
import { Profile } from '../entities/profile.entity';
import { CodeRunnerService } from '../code-runner/code-runner.service';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(UserSubmission)
    private submissionRepository: Repository<UserSubmission>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private codeRunnerService: CodeRunnerService,
  ) {}

  async submit(userId: string, questionId: string, submittedCode: string) {
    const question = await this.questionRepository.findOne({ where: { id: questionId } });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    let isCorrect = false;
    let executionTime = 0; 

    let output = '';

    if (question.qType === 'coding') {
      const result = await this.handleCodingSubmission(question, submittedCode);
      isCorrect = result.isCorrect;
      output = result.output;
    } else if (question.qType === 'parsons') {
      const correctOrder = question.content['correct_order'];
      try {
          const submittedOrder = JSON.parse(submittedCode);
          if (Array.isArray(correctOrder) && Array.isArray(submittedOrder)) {
             isCorrect = JSON.stringify(correctOrder) === JSON.stringify(submittedOrder);
          }
      } catch (e) {
          isCorrect = false;
      }
    } else if (question.qType === 'debug') {
        const buggyCode = question.content['buggy_code'] || '';
        const errorLocation = question.content['error_location'] || '';
        const correctCodeBlock = question.content['correct_code'] || '';
        
        // Construct expected full code
        // Replace ONLY the first occurrence? Or all? Usually first/only.
        const expectedFullCode = buggyCode.replace(errorLocation, correctCodeBlock);
        
        // Normalize (trim whitespace)
        isCorrect = submittedCode.trim() === expectedFullCode.trim();
    } else {
      const correctAnswer = question.content['correct_answer'];
      if (correctAnswer) {
          isCorrect = submittedCode.trim() === correctAnswer.trim();
      } else {
          isCorrect = false;
      }
    }

    const submission = this.submissionRepository.create({
      userId,
      questionId,
      isCorrect,
      submittedAnswer: submittedCode,
      executionTimeMs: executionTime,
    });
    
    await this.submissionRepository.save(submission);

    // Gamification Logic
    const user = await this.profileRepository.findOne({ where: { id: userId } });
    if (user) {
        if (isCorrect) {
            user.xp += 10;
            user.globalEloRating += 15;
        } else {
            user.hp = Math.max(0, user.hp - 1);
            user.globalEloRating = Math.max(0, user.globalEloRating - 15);
        }
        await this.profileRepository.save(user);
    }

    return { ...submission, output };
  }

  private async handleCodingSubmission(question: Question, userCode: string): Promise<{ isCorrect: boolean, output: string }> {
      const testCases = question.content['test_cases'] || [];
      if (testCases.length === 0) {
           const result = await this.codeRunnerService.executeCode(question.language, userCode);
           return { isCorrect: result.stderr === '', output: result.stderr || result.stdout };
      }

      for (const testCase of testCases) {
          let codeToRun = userCode;
          
          if (question.language === 'python') {
              const match = userCode.match(/def\s+(\w+)\s*\(/);
              if (match) {
                  const funcName = match[1];
                  const input = testCase.input; 
                  codeToRun += `\nprint(${funcName}(${input}))`;
              }
          } else if (question.language === 'java') {
              // Wrap method in class if not already present
              if (!userCode.includes('class ')) {
                  const match = userCode.match(/(?:public|private|protected)?\s*(?:static\s+)?[\w<>]+\s+(\w+)\s*\(/);
                  if (match) {
                      const funcName = match[1];
                      const input = testCase.input;
                      codeToRun = `
public class Main {
    ${userCode}

    public static void main(String[] args) {
        Main obj = new Main();
        System.out.println(obj.${funcName}(${input}));
    }
}`;
                  }
              }
          }
          
          const result = await this.codeRunnerService.executeCode(question.language, codeToRun);
          
          if (result.stderr) {
              return { isCorrect: false, output: result.stderr };
          }

          const expected = String(testCase.expected_output).replace(/'/g, "").trim();
          const actual = result.stdout.trim().replace(/'/g, "");
          
          if (actual !== expected) {
              return { isCorrect: false, output: `Expected: ${expected}, Got: ${actual}` };
          }
      }
      return { isCorrect: true, output: 'All tests passed' };
  }
}
