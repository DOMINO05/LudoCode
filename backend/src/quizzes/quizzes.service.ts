import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomQuiz } from '../entities/custom-quiz.entity';
import { QuizQuestion } from '../entities/quiz-question.entity';
import { QuizAttempt } from '../entities/quiz-attempt.entity';
import { Question } from '../entities/question.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(CustomQuiz)
    private quizzesRepository: Repository<CustomQuiz>,
    @InjectRepository(QuizQuestion)
    private quizQuestionsRepository: Repository<QuizQuestion>,
    @InjectRepository(QuizAttempt)
    private quizAttemptsRepository: Repository<QuizAttempt>,
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
  ) {}

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async create(createQuizDto: CreateQuizDto, userId: string): Promise<CustomQuiz> {
    const quiz = this.quizzesRepository.create({
      ...createQuizDto,
      creatorId: userId,
      shareCode: this.generateCode(),
    });
    return this.quizzesRepository.save(quiz);
  }

  async findMyQuizzes(userId: string): Promise<CustomQuiz[]> {
    const quizzes = await this.quizzesRepository.find({
      where: { creatorId: userId },
      relations: ['questions', 'questions.question'],
      order: { createdAt: 'DESC' },
    });

    // Self-healing: Fix missing share codes
    for (const quiz of quizzes) {
      if (!quiz.shareCode) {
        quiz.shareCode = this.generateCode();
        await this.quizzesRepository.update(quiz.id, { shareCode: quiz.shareCode });
      }
    }

    return quizzes;
  }

  async findPublicQuizzes(): Promise<CustomQuiz[]> {
    const quizzes = await this.quizzesRepository.find({
      where: { isPublic: true },
      relations: ['creator', 'questions'],
      order: { createdAt: 'DESC' },
    });

    // Self-healing: Fix missing share codes
    for (const quiz of quizzes) {
      if (!quiz.shareCode) {
        quiz.shareCode = this.generateCode();
        await this.quizzesRepository.update(quiz.id, { shareCode: quiz.shareCode });
      }
    }

    return quizzes;
  }

  async findByShareCode(code: string): Promise<CustomQuiz> {
    const quiz = await this.quizzesRepository.findOne({
      where: { shareCode: code.toUpperCase() },
      relations: ['questions', 'questions.question', 'creator'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found with this share code');
    }

    // Healer: Fix question content on the fly for existing quizzes
    for (const qq of quiz.questions) {
      if (qq.question) {
        const content = qq.question.content;
        let modified = false;

        // 1. Fix field name mismatches
        if (qq.question.qType === 'coding' && content.starter_code && !content.initial_code) {
          content.initial_code = content.starter_code;
          modified = true;
        }
        if (qq.question.qType === 'debug' && content.faulty_code && !content.buggy_code) {
          content.buggy_code = content.faulty_code;
          modified = true;
        }
        if (qq.question.qType === 'predict_output' && content.code && !content.code_snippet) {
          content.code_snippet = content.code;
          modified = true;
        }
        if (qq.question.qType === 'fill_in_blank' && content.code && !content.initial_code) {
          content.initial_code = content.code;
          modified = true;
        }

        // 2. Fix missing Parsons order
        if (qq.question.qType === 'parsons' && content.blocks && !content.correct_order) {
          content.correct_order = content.blocks.map((b: any) => b.id);
          modified = true;
        }

        // 3. Fix missing Debug correct_code
        if (qq.question.qType === 'debug' && content.options && typeof content.correct_answer === 'number' && !content.correct_code) {
          content.correct_code = content.options[content.correct_answer];
          modified = true;
        }

        if (modified) {
          await this.questionsRepository.save(qq.question);
        }
      }
    }

    return quiz;
  }

  async findOne(id: string, userId?: string): Promise<CustomQuiz> {
    const quiz = await this.quizzesRepository.findOne({
      where: { id },
      relations: ['questions', 'questions.question', 'creator'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Check access: must be creator or quiz must be public
    if (quiz.creatorId !== userId && !quiz.isPublic) {
      throw new ForbiddenException('You do not have access to this quiz');
    }

    return quiz;
  }

  async update(id: string, updateQuizDto: UpdateQuizDto, userId: string): Promise<CustomQuiz> {
    const quiz = await this.quizzesRepository.findOne({ where: { id } });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.creatorId !== userId) {
      throw new ForbiddenException('You can only update your own quizzes');
    }

    Object.assign(quiz, updateQuizDto);
    return this.quizzesRepository.save(quiz);
  }

  async remove(id: string, userId: string): Promise<void> {
    const quiz = await this.quizzesRepository.findOne({ where: { id } });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.creatorId !== userId) {
      throw new ForbiddenException('You can only delete your own quizzes');
    }

    // Manual cleanup of attempts if cascade fails in DB
    await this.quizAttemptsRepository.delete({ quizId: id });
    // Manual cleanup of quiz questions
    await this.quizQuestionsRepository.delete({ quizId: id });

    await this.quizzesRepository.remove(quiz);
  }

  async addQuestion(quizId: string, addQuestionDto: AddQuestionDto, userId: string): Promise<QuizQuestion> {
    const quiz = await this.quizzesRepository.findOne({ where: { id: quizId } });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.creatorId !== userId) {
      throw new ForbiddenException('You can only add questions to your own quizzes');
    }

    const question = await this.questionsRepository.findOne({
      where: { id: addQuestionDto.questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Check if question already exists in quiz
    const existing = await this.quizQuestionsRepository.findOne({
      where: { quizId, questionId: addQuestionDto.questionId },
    });

    if (existing) {
      throw new ForbiddenException('Question already added to this quiz');
    }

    const quizQuestion = this.quizQuestionsRepository.create({
      quizId,
      questionId: addQuestionDto.questionId,
      orderIndex: addQuestionDto.orderIndex,
    });

    return this.quizQuestionsRepository.save(quizQuestion);
  }

  async removeQuestion(quizId: string, questionId: string, userId: string): Promise<void> {
    const quiz = await this.quizzesRepository.findOne({ where: { id: quizId } });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.creatorId !== userId) {
      throw new ForbiddenException('You can only remove questions from your own quizzes');
    }

    const quizQuestion = await this.quizQuestionsRepository.findOne({
      where: { quizId, questionId },
    });

    if (!quizQuestion) {
      throw new NotFoundException('Question not found in this quiz');
    }

    await this.quizQuestionsRepository.remove(quizQuestion);
  }

  async updateQuestionOrder(quizId: string, updateOrderDto: UpdateOrderDto, userId: string): Promise<void> {
    const quiz = await this.quizzesRepository.findOne({ where: { id: quizId } });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.creatorId !== userId) {
      throw new ForbiddenException('You can only update your own quizzes');
    }

    // Update each question's order
    for (const item of updateOrderDto.questions) {
      await this.quizQuestionsRepository.update(
        { quizId, questionId: item.questionId },
        { orderIndex: item.orderIndex },
      );
    }
  }

  async submitAttempt(quizId: string, submitAttemptDto: SubmitAttemptDto, userId: string): Promise<QuizAttempt> {
    const quiz = await this.quizzesRepository.findOne({ where: { id: quizId } });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const attempt = this.quizAttemptsRepository.create({
      quizId,
      userId,
      score: submitAttemptDto.score,
      maxScore: submitAttemptDto.maxScore,
      completedAt: new Date(),
    });

    return this.quizAttemptsRepository.save(attempt);
  }

  async getQuizResults(quizId: string, userId: string): Promise<QuizAttempt[]> {
    const quiz = await this.quizzesRepository.findOne({ where: { id: quizId } });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.creatorId !== userId) {
      throw new ForbiddenException('You can only view results for your own quizzes');
    }

    return this.quizAttemptsRepository.find({
      where: { quizId },
      relations: ['user'],
      order: { startedAt: 'DESC' },
    });
  }

  async getMyAttempts(userId: string): Promise<QuizAttempt[]> {
    return this.quizAttemptsRepository.find({
      where: { userId },
      relations: ['quiz'],
      order: { startedAt: 'DESC' },
    });
  }
}
