import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { Concept } from '../entities/concept.entity';
import { Question } from '../entities/question.entity';
import { UserSubmission } from '../entities/user-submission.entity';
import { UserConceptMastery } from '../entities/user-concept-mastery.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Concept, Question, UserSubmission, UserConceptMastery])],
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}
