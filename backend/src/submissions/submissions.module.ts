import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { UserSubmission } from '../entities/user-submission.entity';
import { Question } from '../entities/question.entity';
import { Profile } from '../entities/profile.entity';
import { UserConceptMastery } from '../entities/user-concept-mastery.entity';
import { UserLanguageProgress } from '../entities/user-language-progress.entity';
import { Concept } from '../entities/concept.entity';
import { QuestionConcept } from '../entities/question-concept.entity';
import { CodeRunnerModule } from '../code-runner/code-runner.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSubmission, Question, Profile, UserConceptMastery, UserLanguageProgress, Concept, QuestionConcept]),
    CodeRunnerModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
