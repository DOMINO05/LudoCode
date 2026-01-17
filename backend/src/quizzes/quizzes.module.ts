import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { CustomQuiz } from '../entities/custom-quiz.entity';
import { QuizQuestion } from '../entities/quiz-question.entity';
import { QuizAttempt } from '../entities/quiz-attempt.entity';
import { Question } from '../entities/question.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomQuiz, QuizQuestion, QuizAttempt, Question]),
    AuthModule,
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
