import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSubmission } from '../entities/user-submission.entity';
import { Question } from '../entities/question.entity';
import { CodeRunnerService } from '../code-runner/code-runner.service';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(UserSubmission)
    private submissionRepository: Repository<UserSubmission>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    private codeRunnerService: CodeRunnerService,
  ) {}

  async submit(userId: string, questionId: string, submittedCode: string) {
    const question = await this.questionRepository.findOne({ where: { id: questionId } });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    let isCorrect = false;
    let executionTime = 0; 

    if (question.qType === 'coding') {
      isCorrect = await this.handleCodingSubmission(question, submittedCode);
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

    return this.submissionRepository.save(submission);
  }

  private async handleCodingSubmission(question: Question, userCode: string): Promise<boolean> {
      const testCases = question.content['test_cases'] || [];
      if (testCases.length === 0) {
          // If no test cases, assume simple run is enough, but strictly speaking we can't verify correctness without test cases.
          // For Hello World example, we can check output if we knew what to expect.
          // For now, if no test cases, we return true if no error.
           const result = await this.codeRunnerService.executeCode(question.language, userCode);
           return result.stderr === '';
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
          }
          // Note: Java support requires more complex wrapping logic which is omitted for MVP simplification.
          
          const result = await this.codeRunnerService.executeCode(question.language, codeToRun);
          
          if (result.stderr) {
              return false;
          }

          const expected = String(testCase.expected_output).replace(/'/g, "").trim();
          const actual = result.stdout.trim().replace(/'/g, "");
          
          if (actual !== expected) {
              return false;
          }
      }
      return true;
  }
}
