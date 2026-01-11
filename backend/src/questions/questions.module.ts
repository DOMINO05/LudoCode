import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { Question } from '../entities/question.entity';
import { Profile } from '../entities/profile.entity';
import { UserSubmission } from '../entities/user-submission.entity';
import { UserConceptMastery } from '../entities/user-concept-mastery.entity';
import { Concept } from '../entities/concept.entity';
import { Language } from '../entities/language.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Question,
      Profile,
      UserSubmission,
      UserConceptMastery,
      Concept,
      Language,
    ]),
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
