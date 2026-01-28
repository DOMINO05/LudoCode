import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Question } from '../entities/question.entity';
import { Profile } from '../entities/profile.entity';
import { UserSubmission } from '../entities/user-submission.entity';
import { UserConceptMastery } from '../entities/user-concept-mastery.entity';
import { Concept } from '../entities/concept.entity';
import { Language } from '../entities/language.entity';

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
    @InjectRepository(Language)
    private languageRepository: Repository<Language>,
  ) {}

  private async resolveLanguageId(lang: string): Promise<string> {
    // Check if UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(lang)) {
      return lang;
    }
    // Else assume name
    const language = await this.languageRepository.findOne({
      where: { name: lang },
    });
    if (!language) {
      throw new NotFoundException(`Language not found: ${lang}`);
    }
    return language.id;
  }

  async getPlacementQuestions(languageIdentifier: string): Promise<Question[]> {
    const languageId = await this.resolveLanguageId(languageIdentifier);
    
    const fetchBatch = async (betaMin: number, betaMax: number, count: number) => {
      let questions = await this.questionsRepository
        .createQueryBuilder('question')
        .where('question.languageId = :languageId', { languageId })
        .andWhere('question.creatorId IS NULL')
        .andWhere('question.difficultyBeta BETWEEN :betaMin AND :betaMax', { betaMin, betaMax })
        .andWhere('question.qType != :codingType', { codingType: 'coding' })
        .orderBy('RANDOM()')
        .take(count)
        .getMany();
      
      // Fallback: If not enough in range, just take any non-coding
      if (questions.length < count) {
          const excludeIds = questions.map(q => q.id);
          let query = this.questionsRepository
            .createQueryBuilder('question')
            .where('question.languageId = :languageId', { languageId })
            .andWhere('question.creatorId IS NULL')
            .andWhere('question.qType != :codingType', { codingType: 'coding' });
            
          if (excludeIds.length > 0) {
              query = query.andWhere('question.id NOT IN (:...excludeIds)', { excludeIds });
          }

          const extra = await query
            .orderBy('RANDOM()')
            .take(count - questions.length)
            .getMany();
          questions = [...questions, ...extra];
      }
      return questions;
    };

    const beginners = await fetchBatch(-4.0, -1.0, 3);
    const intermediates = await fetchBatch(-1.0, 1.0, 4);
    const pros = await fetchBatch(1.0, 4.0, 3);

    let result = [...beginners, ...intermediates, ...pros];

    // Final safety: ensure exactly 10 questions
    if (result.length < 10) {
        const excludeIds = result.map(q => q.id);
        let query = this.questionsRepository
            .createQueryBuilder('question')
            .where('question.languageId = :languageId', { languageId })
            .andWhere('question.creatorId IS NULL')
            .andWhere('question.qType != :codingType', { codingType: 'coding' });

        if (excludeIds.length > 0) {
            query = query.andWhere('question.id NOT IN (:...excludeIds)', { excludeIds });
        }

        const extra = await query
            .orderBy('RANDOM()')
            .take(10 - result.length)
            .getMany();
        result = [...result, ...extra];
    }

    return result;
  }

  async getNextQuestion(
    userId: string,
    languageIdentifier: string,
    type?: string,
  ): Promise<Question> {
    const languageId = await this.resolveLanguageId(languageIdentifier);

    const user = await this.profilesRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch recently answered questions to prevent repetition
    const recentSubmissions = await this.submissionsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 12, // Exclude last 12 questions
    });
    const excludedQuestionIds = recentSubmissions
      .map((s) => s.questionId)
      .filter((id) => id !== null) as string[];

    if (type) {
      return this.getAdaptiveQuestion(
        user.globalProficiency,
        languageId,
        [],
        excludedQuestionIds,
        type,
      );
    }

    // 1. Determine Target Concept
    const targetConcept = await this.recommendConcept(userId, languageId);
    if (!targetConcept) {
      // Fallback: Just get any question (or maybe the user finished everything?)
      // For now, let's try to get a random question with appropriate difficulty
      return this.getAdaptiveQuestion(
        user.globalProficiency,
        languageId,
        [],
        excludedQuestionIds,
      );
    }

    // 2. Get Adaptive Question for that Concept
    return this.getAdaptiveQuestion(
      user.globalProficiency,
      languageId,
      [targetConcept.id],
      excludedQuestionIds,
    );
  }

  private async recommendConcept(
    userId: string,
    languageId: string,
  ): Promise<Concept | null> {
    // Fetch all concepts and user mastery for the language
    const concepts = await this.conceptRepository.find({
      relations: ['prerequisites'],
    });
    const userMasteries = await this.masteryRepository.find({
      where: { userId, languageId },
    });

    // Create a map for quick lookup: conceptId -> masteryProbability
    const masteryMap = new Map<string, number>();
    userMasteries.forEach((m) =>
      masteryMap.set(m.conceptId, m.masteryProbability),
    );

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
    return learnableConcepts[
      Math.floor(Math.random() * learnableConcepts.length)
    ];
  }

  private async getAdaptiveQuestion(
    userTheta: number,
    languageId: string,
    conceptIds: string[],
    excludedQuestionIds: string[] = [],
    type?: string,
  ): Promise<Question> {
    // IRT: Target difficulty (Beta) should be close to User Ability (Theta)
    // We look for questions in range [Theta - 0.5, Theta + 0.5] first
    // The range can be expanded if no questions found.

    const findInBetaRange = async (range: number) => {
      let query = this.questionsRepository
        .createQueryBuilder('question')
        .leftJoinAndSelect('question.language', 'language') // Load language relation?
        .leftJoin('question.questionConcepts', 'qc')
        .where('question.languageId = :languageId', { languageId }) // Use Property Name
        .andWhere('question.creatorId IS NULL')
        .andWhere('question.difficultyBeta BETWEEN :min AND :max', {
          min: userTheta - range,
          max: userTheta + range,
        });

      if (conceptIds.length > 0) {
        query = query.andWhere('qc.concept_id IN (:...conceptIds)', {
          conceptIds,
        });
      }

      if (excludedQuestionIds.length > 0) {
        query = query.andWhere('question.id NOT IN (:...excludedQuestionIds)', {
          excludedQuestionIds,
        });
      }

      if (type) {
        query = query.andWhere('question.qType = :type', { type });
      }

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
        return this.getAdaptiveQuestion(
          userTheta,
          languageId,
          [],
          excludedQuestionIds,
          type,
        );
      }
      throw new NotFoundException('No suitable questions found');
    }

    return question;
  }

  async getRandomQuestionByType(
    type: string,
    languageIdentifier?: string,
  ): Promise<Question> {
    console.log(`Getting random question for type: ${type}`);
    let query = this.questionsRepository.createQueryBuilder('question');

    if (type) {
      query = query.where('question.qType = :type', { type });
    }

    query = query.andWhere('question.creatorId IS NULL');

    if (languageIdentifier) {
      const languageId = await this.resolveLanguageId(languageIdentifier);
      query = query.andWhere('question.languageId = :languageId', {
        languageId,
      });
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

  async searchQuestions(
    userId: string,
    filter: {
      title?: string;
      qType?: string;
      languageId?: string;
      onlyMine?: boolean;
    },
  ): Promise<Question[]> {
    let query = this.questionsRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.language', 'language');

    if (filter.onlyMine) {
      query = query.where('question.creatorId = :userId', { userId });
    } else {
      query = query.where(
        '(question.creatorId IS NULL OR question.creatorId = :userId)',
        { userId },
      );
    }

    if (filter.title) {
      query = query.andWhere('question.title ILIKE :title', {
        title: `%${filter.title}%`,
      });
    }

    if (filter.qType) {
      query = query.andWhere('question.qType = :qType', {
        qType: filter.qType,
      });
    }

    if (filter.languageId) {
      query = query.andWhere('question.languageId = :languageId', {
        languageId: filter.languageId,
      });
    }

    return query.getMany();
  }

  async createCustomQuestion(dto: any, userId: string): Promise<Question> {
    const content = { ...dto.content };
    const title = dto.title || `Saját kérdés - ${new Date().toLocaleDateString()}`;
    const languageId = await this.resolveLanguageId(dto.languageId);

    // Normalization: Ensure field names match what components expect
    if (dto.qType === 'coding' && content.starter_code) {
      content.initial_code = content.starter_code;
    }
    if (dto.qType === 'debug' && content.faulty_code) {
      content.buggy_code = content.faulty_code;
    }
    if (dto.qType === 'predict_output' && content.code) {
      content.code_snippet = content.code;
    }
    if (dto.qType === 'fill_in_blank' && content.code) {
      content.initial_code = content.code;
    }

    // Auto-generate blocks if needed (Parsons or Coding with blocks)
    if (
      (dto.qType === 'parsons' || content.input_mode === 'blocks' || content.input_mode === 'both') &&
      content.solution &&
      !content.blocks
    ) {
      const lines = content.solution
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
      
      content.blocks = lines.map((line: string, index: number) => ({
        id: `block-${index}`,
        text: line,
      }));

      // Generate correct_order for Parsons
      if (dto.qType === 'parsons') {
        content.correct_order = content.blocks.map(b => b.id);
      }
    }

    // Handle Debug type specific fields
    if (dto.qType === 'debug' && content.options && typeof content.correct_answer === 'number') {
        content.correct_code = content.options[content.correct_answer];
    }

    const question = this.questionsRepository.create({
      title,
      description: dto.description,
      qType: dto.qType,
      languageId: languageId,
      content: content,
      creatorId: userId,
      // Default IRT params for new user questions
      difficultyBeta: 0.0,
      discriminationAlpha: 1.0,
      difficultyDisplay: 1000,
    });
    return this.questionsRepository.save(question);
  }

  async updateCustomQuestion(
    id: string,
    dto: any,
    userId: string,
  ): Promise<Question> {
    const question = await this.questionsRepository.findOne({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.creatorId !== userId) {
      throw new Error('You can only edit your own questions');
    }

    const content = { ...dto.content };
    const languageId = await this.resolveLanguageId(dto.languageId);

    // Normalization
    if (dto.qType === 'coding' && content.starter_code) {
      content.initial_code = content.starter_code;
    }
    if (dto.qType === 'debug' && content.faulty_code) {
      content.buggy_code = content.faulty_code;
    }
    if (dto.qType === 'predict_output' && content.code) {
      content.code_snippet = content.code;
    }
    if (dto.qType === 'fill_in_blank' && content.code) {
      content.initial_code = content.code;
    }

    // Parsons block generation
    if (
      (dto.qType === 'parsons' ||
        content.input_mode === 'blocks' ||
        content.input_mode === 'both') &&
      content.solution &&
      !content.blocks
    ) {
      const lines = content.solution
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);

      content.blocks = lines.map((line: string, index: number) => ({
        id: `block-${index}`,
        text: line,
      }));

      if (dto.qType === 'parsons') {
        content.correct_order = content.blocks.map((b) => b.id);
      }
    }

    // Debug correct_code
    if (
      dto.qType === 'debug' &&
      content.options &&
      typeof content.correct_answer === 'number'
    ) {
      content.correct_code = content.options[content.correct_answer];
    }

    Object.assign(question, {
      title: dto.title,
      description: dto.description,
      qType: dto.qType,
      languageId,
      content,
    });

    return this.questionsRepository.save(question);
  }

  async findOne(id: string, userId: string): Promise<Question> {
    const question = await this.questionsRepository.findOne({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.creatorId && question.creatorId !== userId) {
      throw new Error('Access denied to this question');
    }

    return question;
  }
}
