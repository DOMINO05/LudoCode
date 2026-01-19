import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSubmission } from '../entities/user-submission.entity';
import { Question } from '../entities/question.entity';
import { Profile } from '../entities/profile.entity';
import { UserConceptMastery } from '../entities/user-concept-mastery.entity';
import { UserLanguageProgress } from '../entities/user-language-progress.entity';
import { CodeRunnerService } from '../code-runner/code-runner.service';
import { AIService } from '../common/services/ai.service';
import { BadgesService } from '../badges/badges.service';
import { ChallengesService } from '../challenges/challenges.service';

interface QuestionContent {
  correct_order?: string[];
  buggy_code?: string;
  error_location?: string;
  correct_code?: string;
  correct_answer?: string;
  test_cases?: { input: string | number; expected_output: string | number }[];
  [key: string]: any;
}

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(UserSubmission)
    private submissionRepository: Repository<UserSubmission>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(UserConceptMastery)
    private masteryRepository: Repository<UserConceptMastery>,
    @InjectRepository(UserLanguageProgress)
    private languageProgressRepository: Repository<UserLanguageProgress>,
    private codeRunnerService: CodeRunnerService,
    private aiService: AIService,
    private badgesService: BadgesService,
    private challengesService: ChallengesService,
  ) {}

  async submit(
    userId: string,
    questionId: string,
    submittedCode: string,
    executionTimeMs: number,
    streak: number = 0,
    isPlacement: boolean = false,
  ) {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['questionConcepts', 'questionConcepts.concept', 'language'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const content = question.content as QuestionContent;
    let isCorrect = false;
    let output = '';

    if (question.qType === 'coding') {
      const result = await this.handleCodingSubmission(
        question,
        submittedCode,
        content,
      );
      isCorrect = result.isCorrect;
      output = result.output;
    } else if (question.qType === 'parsons') {
      const correctOrder = content.correct_order;
      try {
        const submittedOrder = JSON.parse(submittedCode) as string[];
        if (Array.isArray(correctOrder) && Array.isArray(submittedOrder)) {
          isCorrect =
            JSON.stringify(correctOrder) === JSON.stringify(submittedOrder);
        }
      } catch (e) {
        // Log error if needed, for now just treat as incorrect
        isCorrect = false;
      }
    } else if (question.qType === 'debug') {
      const buggyCode = content.buggy_code || '';
      const errorLocation = content.error_location || '';
      const correctCodeBlock = content.correct_code || '';
      const expectedFullCode = buggyCode.replace(
        errorLocation,
        correctCodeBlock,
      );
      isCorrect = submittedCode.trim() === expectedFullCode.trim();
    } else {
      let correctAnswer = content.correct_answer;
      // Handle numeric index for options
      if (typeof correctAnswer === 'number' && content.options) {
        correctAnswer = content.options[correctAnswer];
      }

      if (correctAnswer !== undefined && correctAnswer !== null) {
        isCorrect =
          String(submittedCode).trim() === String(correctAnswer).trim();
      } else {
        isCorrect = false;
      }
    }

    if (isPlacement) {
      return {
        isCorrect,
        output,
        explanation: content.explanation,
      };
    }

    // --- BKT (Bayesian Knowledge Tracing) Logic ---
    let masteryBefore = 0;
    let masteryAfter = 0;
    let conceptsProcessed = 0;

    for (const qc of question.questionConcepts) {
      const concept = qc.concept;
      const languageId = question.languageId;

      // Find existing mastery or create default for THIS language
      let mastery = await this.masteryRepository.findOne({
        where: { userId, conceptId: concept.id, languageId },
      });

      if (!mastery) {
        mastery = this.masteryRepository.create({
          userId,
          conceptId: concept.id,
          languageId,
          masteryProbability: concept.pInit, // Start with P(L0)
          totalAttempts: 0,
        });
      }

      const pPrev = mastery.masteryProbability;
      masteryBefore += pPrev;
      conceptsProcessed++;

      // Bayes Theorem Update
      // P(L|Correct) = (P(L) * (1 - P(S))) / (P(L) * (1 - P(S)) + (1 - P(L)) * P(G))
      // P(L|Incorrect) = (P(L) * P(S)) / (P(L) * P(S) + (1 - P(L)) * (1 - P(G)))

      let pLearnedGivenEvidence = 0.0;

      if (isCorrect) {
        const num = pPrev * (1 - concept.pSlip);
        const den = num + (1 - pPrev) * concept.pGuess;
        pLearnedGivenEvidence = num / den;
      } else {
        const num = pPrev * concept.pSlip;
        const den = num + (1 - pPrev) * (1 - concept.pGuess);
        pLearnedGivenEvidence = num / den;
      }

      // Add Learning Rate (Transition)
      // P(New) = P(L|Evidence) + (1 - P(L|Evidence)) * P(T)
      let pNew =
        pLearnedGivenEvidence + (1 - pLearnedGivenEvidence) * concept.pTransit;

      // Apply Question Weight
      // If the question is only partially related (weight < 1.0), the update should be dampened.
      // pFinal = pPrev + (pNew - pPrev) * weight
      const delta = pNew - pPrev;
      pNew = pPrev + delta * qc.weight;

      mastery.masteryProbability = Math.min(0.99, Math.max(0.01, pNew));
      mastery.totalAttempts += 1;
      mastery.lastPracticedAt = new Date();

      await this.masteryRepository.save(mastery);
      masteryAfter += mastery.masteryProbability;
    }

    // Average mastery for the submission record
    if (conceptsProcessed > 0) {
      masteryBefore /= conceptsProcessed;
      masteryAfter /= conceptsProcessed;
    }

    // Calculate Multiplier
    // Streak >= 2 means we have at least 2 consecutive correct answers previously.
    // Bonus starts at 1.3x for streak 2, +0.1 for each subsequent.
    let multiplier = 1.0;
    if (isCorrect && streak >= 2) {
      multiplier = 1.3 + (streak - 2) * 0.1;
    }

    // --- Language Progress Update ---
    let languageProgress = await this.languageProgressRepository.findOne({
      where: { userId, languageId: question.languageId },
    });

    if (!languageProgress) {
      languageProgress = this.languageProgressRepository.create({
        userId,
        languageId: question.languageId,
        xp: 0,
        proficiency: 0.0,
      });
    }

    if (isCorrect) {
      languageProgress.xp += Math.round(10 * multiplier);
      languageProgress.proficiency = Math.min(
        3.0,
        languageProgress.proficiency + 0.05,
      );
    } else {
      // Drop proficiency slightly?
      // languageProgress.proficiency = Math.max(-3.0, languageProgress.proficiency - 0.02);
    }
    await this.languageProgressRepository.save(languageProgress);

    // --- Profile Update (Global Stats) ---
    const user = await this.profileRepository.findOne({
      where: { id: userId },
    });
    if (user) {
      if (isCorrect) {
        user.xp += Math.round(10 * multiplier); // Global XP accumulation
        user.gems += Math.round(1 * multiplier);

        // Update Max Combo (High Score)
        const currentSessionStreak = streak + 1;
        if (currentSessionStreak > (user.maxCombo || 0)) {
          user.maxCombo = currentSessionStreak;
        }

        user.globalProficiency = Math.min(3.0, user.globalProficiency + 0.02);
      } else {
        user.sanityPoints = Math.max(0, user.sanityPoints - 10);
      }
      await this.profileRepository.save(user);
    }

    const submission = this.submissionRepository.create({
      userId,
      questionId,
      isCorrect,
      submittedAnswer: submittedCode,
      executionTimeMs,
      masteryBefore,
      masteryAfter,
    });

    await this.submissionRepository.save(submission);

    // Check for new badges
    const newBadges = await this.badgesService.checkAndAwardBadges(userId);

    // Update Challenges
    let completedChallenges = [];
    if (isCorrect) {
        const solved = await this.challengesService.updateProgress(userId, 'SOLVE_QUESTION', 1);
        completedChallenges = [...completedChallenges, ...solved];

        const earnedGems = Math.round(1 * multiplier);
        const gemChallenges = await this.challengesService.updateProgress(userId, 'EARN_GEMS', earnedGems);
        completedChallenges = [...completedChallenges, ...gemChallenges];
    }

    let aiExplanation = null;
    if (!isCorrect) {
      aiExplanation = await this.aiService.getErrorExplanation(
        question.title,
        question.description,
        content.correct_answer || content.correct_code || 'N/A',
        submittedCode,
        question.language.name,
      );
    }

    return {
      ...submission,
      output,
      explanation: content.explanation,
      correct_answer: content.correct_answer || content.correct_code || content.correct_order,
      hint: question.hint,
      ai_explanation: aiExplanation,
      newBadges: newBadges.map((ub) => ub.badge),
      completedChallenges,
      userUpdates: {
        xp: user?.xp,
        sanity: user?.sanityPoints,
        gems: user?.gems,
        proficiency: user?.globalProficiency,
        multiplier: multiplier,
      },
    };
  }

  async getOldestUnresolvedMistake(userId: string) {
    const submission = await this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.question', 'question')
      .leftJoinAndSelect('question.language', 'language')
      .where('submission.userId = :userId', { userId })
      .andWhere('submission.isCorrect = false')
      .andWhere('submission.isResolved = false')
      .andWhere('submission.questionId IS NOT NULL')
      .orderBy('submission.createdAt', 'ASC')
      .getOne();

    if (!submission || !submission.question) {
      throw new NotFoundException('Nincs több javítandó feladat.');
    }

    return submission;
  }

  async resolveMistake(userId: string, submissionId: string, submittedCode: string) {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId, userId, isCorrect: false, isResolved: false },
      relations: ['question', 'question.language'],
    });

    if (!submission) {
      throw new NotFoundException('Hibás beküldés nem található.');
    }

    // Evaluate the new answer
    const question = submission.question;
    const content = question.content as QuestionContent;
    let isCorrectNow = false;
    let output = '';

    if (question.qType === 'coding') {
      const result = await this.handleCodingSubmission(question, submittedCode, content);
      isCorrectNow = result.isCorrect;
      output = result.output;
    } else if (question.qType === 'parsons') {
      const correctOrder = content.correct_order;
      try {
        const submittedOrder = JSON.parse(submittedCode) as string[];
        if (Array.isArray(correctOrder) && Array.isArray(submittedOrder)) {
          isCorrectNow = JSON.stringify(correctOrder) === JSON.stringify(submittedOrder);
        }
      } catch (e) { isCorrectNow = false; }
    } else if (question.qType === 'debug') {
      const expectedFullCode = (content.buggy_code || '').replace(content.error_location || '', content.correct_code || '');
      isCorrectNow = submittedCode.trim() === expectedFullCode.trim();
    } else {
      let correctAnswer = content.correct_answer;
      if (typeof correctAnswer === 'number' && content.options) correctAnswer = content.options[correctAnswer];
      isCorrectNow = String(submittedCode).trim() === String(correctAnswer).trim();
    }

    if (isCorrectNow) {
      // Mark all previous incorrect, unresolved submissions for this question as resolved
      await this.submissionRepository.update(
        {
          userId,
          questionId: submission.questionId,
          isCorrect: false,
          isResolved: false,
        },
        { isResolved: true },
      );

      // Restore Sanity: Always 10% regardless of number of mistakes
      const user = await this.profileRepository.findOne({ where: { id: userId } });
      if (user) {
        user.sanityPoints = Math.min(100, user.sanityPoints + 10);
        await this.profileRepository.save(user);
      }

      await this.challengesService.updateProgress(userId, 'RESOLVE_MISTAKE', 1);

      return { success: true, message: 'Feladat sikeresen javítva! +10% Sanity.', newSanity: user?.sanityPoints };
    } else {
      return { success: false, message: 'Még mindig nem pontos a megoldás. Próbáld újra!', output };
    }
  }

  private async handleCodingSubmission(
    question: Question,
    userCode: string,
    content: QuestionContent,
  ): Promise<{ isCorrect: boolean; output: string }> {
    const testCases = content.test_cases || [];
    if (testCases.length === 0) {
      // Use question.language.name
      const result = await this.codeRunnerService.executeCode(
        question.language.name,
        userCode,
      );
      return {
        isCorrect: result.stderr === '',
        output: result.stderr || result.stdout,
      };
    }

    for (const testCase of testCases) {
      let codeToRun = userCode;

      // Using question.language.name assuming Language entity has 'name' like 'python'
      const langName = question.language.name;

      if (langName === 'python') {
        const match = userCode.match(/def\s+(\w+)\s*\(/);
        if (match) {
          const funcName = match[1];
          const input = testCase.input;
          codeToRun += `\nprint(${funcName}(${input}))`;
        }
      } else if (langName === 'java') {
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

      const result = await this.codeRunnerService.executeCode(
        question.language.name,
        codeToRun,
      );

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
}
