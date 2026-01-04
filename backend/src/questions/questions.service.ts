import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
import { Profile } from '../entities/profile.entity';
import { UserSubmission } from '../entities/user-submission.entity';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
    @InjectRepository(UserSubmission)
    private submissionsRepository: Repository<UserSubmission>,
  ) {}

  async getNextQuestion(userId: string): Promise<Question> {
    const user = await this.profilesRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const solvedSubmissions = await this.submissionsRepository.find({
      where: { userId, isCorrect: true },
      select: ['questionId'],
    });
    const solvedQuestionIds = solvedSubmissions.map(s => s.questionId).filter(id => id !== null);

    const findQuestion = async (range: number) => {
      const minElo = user.globalEloRating - range;
      const maxElo = user.globalEloRating + range;

      let query = this.questionsRepository.createQueryBuilder('question')
        .where('question.difficulty_rating BETWEEN :min AND :max', { min: minElo, max: maxElo });

      if (solvedQuestionIds.length > 0) {
        query = query.andWhere('question.id NOT IN (:...ids)', { ids: solvedQuestionIds });
      }

      return query.orderBy('RANDOM()').getOne();
    };

    let question = await findQuestion(100);
    
    if (!question) {
      question = await findQuestion(200);
    }

    if (!question) {
       let query = this.questionsRepository.createQueryBuilder('question');
       if (solvedQuestionIds.length > 0) {
         query = query.where('question.id NOT IN (:...ids)', { ids: solvedQuestionIds });
       }
       question = await query.orderBy('RANDOM()').getOne();
    }

    if (!question) {
        throw new NotFoundException('No more questions available');
    }

    return question;
  }
}
