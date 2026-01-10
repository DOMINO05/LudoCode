import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
import { Profile } from '../entities/profile.entity';
import { UserSubmission } from '../entities/user-submission.entity';
import { UserConceptMastery } from '../entities/user-concept-mastery.entity';
import { Concept } from '../entities/concept.entity';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
    @InjectRepository(UserSubmission)
    private submissionsRepository: Repository<UserSubmission>,
    @InjectRepository(UserConceptMastery)
    private masteryRepository: Repository<UserConceptMastery>,
    @InjectRepository(Concept)
    private conceptRepository: Repository<Concept>,
  ) {}

  async getNextQuestion(userId: string, languageId: string): Promise<Question> {
    const user = await this.profilesRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Determine Target Concept
    const targetConcept = await this.recommendConcept(userId, languageId);
    if (!targetConcept) {
        // Fallback: Just get any question (or maybe the user finished everything?)
        // For now, let's try to get a random question with appropriate difficulty
        return this.getAdaptiveQuestion(user.globalProficiency, languageId, []);
    }

    // 2. Get Adaptive Question for that Concept
    return this.getAdaptiveQuestion(user.globalProficiency, languageId, [targetConcept.id]);
  }

  private async recommendConcept(userId: string, languageId: string): Promise<Concept | null> {
    // Fetch all concepts and user mastery for the language
    const concepts = await this.conceptRepository.find({ relations: ['prerequisites'] });
    const userMasteries = await this.masteryRepository.find({ where: { userId, languageId } });
    
    // Create a map for quick lookup: conceptId -> masteryProbability
    const masteryMap = new Map<string, number>();
    userMasteries.forEach(m => masteryMap.set(m.conceptId, m.masteryProbability));

    const learnableConcepts: Concept[] = [];

    for (const concept of concepts) {
        const currentMastery = masteryMap.get(concept.id) || 0;
        
        // If already mastered, skip (unless we want review?)
        if (currentMastery >= 0.95) continue;

        // Check prerequisites
        let allPrereqsMet = true;
        for (const prereq of concept.prerequisites) {
            const prereqMastery = masteryMap.get(prereq.id) || 0;
            // Threshold for "knowing" a prerequisite enough to move on
            if (prereqMastery < 0.7) { 
                allPrereqsMet = false;
                break;
            }
        }

        if (allPrereqsMet) {
            learnableConcepts.push(concept);
        }
    }

    if (learnableConcepts.length === 0) return null;

    // Pick one. Strategy: Prioritize lowest mastery? Or random?
    // Let's pick random from learnable to keep variety
    return learnableConcepts[Math.floor(Math.random() * learnableConcepts.length)];
  }

  private async getAdaptiveQuestion(userTheta: number, languageId: string, conceptIds: string[]): Promise<Question> {
      // IRT: Target difficulty (Beta) should be close to User Ability (Theta)
      // We look for questions in range [Theta - 0.5, Theta + 0.5] first
      // The range can be expanded if no questions found.

      const findInBetaRange = async (range: number) => {
          let query = this.questionsRepository.createQueryBuilder('question')
            .leftJoin('question.questionConcepts', 'qc')
            .where('question.language_id = :languageId', { languageId })
            .andWhere('question.difficulty_beta BETWEEN :min AND :max', { 
                min: userTheta - range, 
                max: userTheta + range 
            });

          if (conceptIds.length > 0) {
              query = query.andWhere('qc.concept_id IN (:...conceptIds)', { conceptIds });
          }

          // Avoid duplicates? The current service filtered solved questions. 
          // Ideally in adaptive learning you can repeat questions after a while, 
          // but let's stick to "unseen" if possible or just random for now.
          // Since we don't pass solved IDs here, we might repeat. 
          // Let's add simple random ordering.
          
          return query.orderBy('RANDOM()').getOne();
      };

      // Try tight range
      let question = await findInBetaRange(0.5);
      
      // Try medium range
      if (!question) {
          question = await findInBetaRange(1.0);
      }

      // Try wide range
      if (!question) {
           question = await findInBetaRange(3.0);
      }
      
      if (!question) {
           // Fallback if absolutely nothing matches (e.g. concept has no questions yet)
           // Try without concept filter
           if (conceptIds.length > 0) {
               return this.getAdaptiveQuestion(userTheta, languageId, []);
           }
           throw new NotFoundException('No suitable questions found');
      }

      return question;
  }

  async getRandomQuestionByType(type: string, languageId?: string): Promise<Question> {
    console.log(`Getting random question for type: ${type}`);
    let query = this.questionsRepository.createQueryBuilder('question');
    
    if (type) {
        query = query.where('question.qType = :type', { type });
    }
    
    if (languageId) {
        query = query.andWhere('question.language_id = :languageId', { languageId });
    }

    const count = await query.getCount();
    console.log(`Found ${count} questions for type ${type}`);

    const question = await query.orderBy('RANDOM()').getOne();

    if (!question) {
        console.log('No question returned by query');
        throw new NotFoundException(`No questions found for type: ${type}`);
    }

    return question;
  }
}
