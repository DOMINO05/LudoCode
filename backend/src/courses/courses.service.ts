import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Concept } from '../entities/concept.entity';
import { Question } from '../entities/question.entity';
import { UserSubmission } from '../entities/user-submission.entity';
import { UserConceptMastery } from '../entities/user-concept-mastery.entity';

export interface ProgressData {
  id: string;
  name: string;
  description: string;
  total_questions: number;
  completed_questions: number;
  percentage: number;
  is_locked: boolean;
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Concept)
    private conceptsRepository: Repository<Concept>,
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
    @InjectRepository(UserSubmission)
    private submissionsRepository: Repository<UserSubmission>,
    @InjectRepository(UserConceptMastery)
    private masteryRepository: Repository<UserConceptMastery>,
  ) {}

  async getProgress(
    userId: string,
    languageId: string,
  ): Promise<ProgressData[]> {
    const concepts = await this.conceptsRepository.find({
      relations: [
        'questionConcepts',
        'questionConcepts.question',
        'prerequisites',
      ],
      order: { name: 'ASC' },
    });

    const userMasteries = await this.masteryRepository.find({
      where: { userId, languageId },
    });
    const masteryMap = new Map(userMasteries.map((m) => [m.conceptId, m]));

    const progressData: ProgressData[] = [];

    for (const concept of concepts) {
      // Calculate progress based on BKT Mastery Probability
      const mastery = masteryMap.get(concept.id);
      const progressPercent = mastery
        ? Math.round(mastery.masteryProbability * 100)
        : 0;

      // Determine if locked based on Prerequisites
      let isLocked = false;
      if (concept.prerequisites && concept.prerequisites.length > 0) {
        for (const prereq of concept.prerequisites) {
          // Check prereq mastery IN THE SAME LANGUAGE
          const prereqMastery = masteryMap.get(prereq.id);
          if (!prereqMastery || prereqMastery.masteryProbability < 0.7) {
            isLocked = true;
            break;
          }
        }
      }

      // Count questions for display (filtered by language)
      const totalQuestions = concept.questionConcepts
        ? concept.questionConcepts.filter(
            (qc) => qc.question.languageId === languageId,
          ).length
        : 0;

      progressData.push({
        id: concept.id,
        name: concept.name,
        description: concept.description,
        total_questions: totalQuestions,
        completed_questions: mastery ? mastery.totalAttempts : 0, // This is attempts, not unique solved.
        percentage: progressPercent,
        is_locked: isLocked,
      });
    }

    return progressData;
  }

  async getNextQuestionForConcept(
    userId: string,
    conceptId: string,
    languageId: string,
  ) {
    const concept = await this.conceptsRepository.findOne({
      where: { id: conceptId },
      relations: ['questionConcepts', 'questionConcepts.question'],
    });

    if (!concept) return null;

    const userSubmissions = await this.submissionsRepository.find({
      where: { userId, isCorrect: true },
      select: ['questionId'],
    });
    const solvedIds = new Set(userSubmissions.map((s) => s.questionId));

    // Filter QCs by language first
    const languageQCs = concept.questionConcepts.filter(
      (qc) => qc.question.languageId === languageId,
    );

    // Find a question not yet solved
    const unsolvedQC = languageQCs.find((qc) => !solvedIds.has(qc.questionId));

    if (!unsolvedQC) {
      // If all solved, pick random one?
      if (languageQCs.length > 0) {
        const randomQC =
          languageQCs[Math.floor(Math.random() * languageQCs.length)];
        return randomQC.question;
      }
      return null;
    }

    return unsolvedQC.question;
  }
}
