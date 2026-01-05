import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Concept } from '../entities/concept.entity';
import { Question } from '../entities/question.entity';
import { UserSubmission } from '../entities/user-submission.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Concept)
    private conceptsRepository: Repository<Concept>,
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
    @InjectRepository(UserSubmission)
    private submissionsRepository: Repository<UserSubmission>,
  ) {}

  async getProgress(userId: string) {
    const concepts = await this.conceptsRepository.find({
        relations: ['questions'],
        order: { name: 'ASC' } 
    });

    const userSubmissions = await this.submissionsRepository.find({
        where: { userId, isCorrect: true },
        select: ['questionId']
    });
    const solvedQuestionIds = new Set(userSubmissions.map(s => s.questionId));

    const progressData = [];
    let previousConceptCompleted = true; // First one unlocked

    for (const concept of concepts) {
        const totalQuestions = concept.questions.length;
        let completedQuestions = 0;
        
        for (const q of concept.questions) {
            if (solvedQuestionIds.has(q.id)) {
                completedQuestions++;
            }
        }

        const percentage = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0;
        const isLocked = !previousConceptCompleted;

        progressData.push({
            id: concept.id,
            name: concept.name,
            description: concept.description,
            total_questions: totalQuestions,
            completed_questions: completedQuestions,
            percentage: Math.round(percentage),
            is_locked: isLocked
        });

        // Unlock next if >= 80% completed
        previousConceptCompleted = percentage >= 80;
    }

    return progressData;
  }

  async getNextQuestionForConcept(userId: string, conceptId: string) {
      const concept = await this.conceptsRepository.findOne({
          where: { id: conceptId },
          relations: ['questions']
      });

      if (!concept) return null;

      const userSubmissions = await this.submissionsRepository.find({
        where: { userId, isCorrect: true },
        select: ['questionId']
      });
      const solvedIds = new Set(userSubmissions.map(s => s.questionId));

      const unsolved = concept.questions.find(q => !solvedIds.has(q.id));
      
      if (!unsolved) return null; 

      return this.questionsRepository.findOne({ where: { id: unsolved.id } });
  }
}
