import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { Question } from '../entities/question.entity';
import { Profile } from '../entities/profile.entity';
import { UserSubmission } from '../entities/user-submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Profile, UserSubmission])],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
