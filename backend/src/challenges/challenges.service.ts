import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { ChallengeTemplate } from '../entities/challenge-template.entity';
import { UserChallenge } from '../entities/user-challenge.entity';
import { Profile } from '../entities/profile.entity';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(ChallengeTemplate)
    private templatesRepository: Repository<ChallengeTemplate>,
    @InjectRepository(UserChallenge)
    private userChallengesRepository: Repository<UserChallenge>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async getActiveChallenges(userId: string) {
    await this.ensureDailyChallenges(userId);
    await this.ensureWeeklyChallenges(userId);

    const now = new Date();
    return this.userChallengesRepository.find({
      where: { 
        userId, 
        expiresAt: MoreThanOrEqual(now)
      },
      relations: ['template'],
      order: { isCompleted: 'ASC', isClaimed: 'ASC', expiresAt: 'ASC' }
    });
  }

  async ensureDailyChallenges(userId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const existing = await this.userChallengesRepository.count({
      where: {
        userId,
        template: { period: 'DAILY' },
        createdAt: MoreThanOrEqual(startOfDay),
      },
      relations: ['template']
    });

    if (existing > 0) return;

    // Generate 3 deterministic daily challenges (same for everyone)
    const dailyTemplates = await this.templatesRepository.find({ where: { period: 'DAILY' } });
    if (dailyTemplates.length === 0) return;

    const sorted = dailyTemplates.sort((a, b) => a.id.localeCompare(b.id));
    const dayIndex = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
    const count = 3;
    const startIndex = (dayIndex * count) % sorted.length;
    
    const selected = [];
    for (let i = 0; i < count; i++) {
        selected.push(sorted[(startIndex + i) % sorted.length]);
    }

    const challenges = selected.map(tpl => this.userChallengesRepository.create({
      userId,
      templateId: tpl.id,
      actionType: tpl.actionType,
      goalValue: tpl.goalValue,
      rewardXp: tpl.rewardXp,
      rewardGems: tpl.rewardGems,
      description: tpl.descriptionTemplate.replace('{goal}', tpl.goalValue.toString()),
      expiresAt: endOfDay,
    }));

    await this.userChallengesRepository.save(challenges);
  }

  async ensureWeeklyChallenges(userId: string) {
    const now = new Date();
    // Create a copy to avoid mutating the original 'now'
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get start of week (Monday)
    const day = today.getDay(); 
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
    const startOfWeek = new Date(today.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // Use QueryBuilder for more robust counting across relations
    const existing = await this.userChallengesRepository
      .createQueryBuilder('uc')
      .innerJoin('uc.template', 't')
      .where('uc.userId = :userId', { userId })
      .andWhere('t.period = :period', { period: 'WEEKLY' })
      .andWhere('uc.createdAt >= :startOfWeek', { startOfWeek })
      .getCount();

    if (existing > 0) return;

    // Generate 3 deterministic weekly challenges (same for everyone)
    const weeklyTemplates = await this.templatesRepository.find({ where: { period: 'WEEKLY' } });
    if (weeklyTemplates.length === 0) return;

    const sorted = weeklyTemplates.sort((a, b) => a.id.localeCompare(b.id));
    // Week index (approximate, good enough for rotation)
    const weekIndex = Math.floor(now.getTime() / (1000 * 60 * 60 * 24 * 7));
    const count = 3;
    const startIndex = (weekIndex * count) % sorted.length;

    const selected = [];
    for (let i = 0; i < count; i++) {
        selected.push(sorted[(startIndex + i) % sorted.length]);
    }

    const challenges = selected.map(tpl => this.userChallengesRepository.create({
      userId,
      templateId: tpl.id,
      actionType: tpl.actionType,
      goalValue: tpl.goalValue,
      rewardXp: tpl.rewardXp,
      rewardGems: tpl.rewardGems,
      description: tpl.descriptionTemplate.replace('{goal}', tpl.goalValue.toString()),
      expiresAt: endOfWeek,
    }));

    await this.userChallengesRepository.save(challenges);
  }

  async updateProgress(userId: string, actionType: string, amount: number) {
    const now = new Date();
    const activeChallenges = await this.userChallengesRepository.find({
      where: {
        userId,
        actionType,
        isCompleted: false,
        expiresAt: MoreThanOrEqual(now),
      }
    });

    const completed: UserChallenge[] = [];

    for (const challenge of activeChallenges) {
      let justCompleted = false;
      if (actionType === 'STREAK') {
        // Streak is absolute value check
        if (amount >= challenge.goalValue) {
            challenge.currentValue = amount;
            challenge.isCompleted = true;
            justCompleted = true;
        } else {
            challenge.currentValue = amount;
        }
      } else {
        // Others are incremental
        challenge.currentValue += amount;
        if (challenge.currentValue >= challenge.goalValue) {
          challenge.currentValue = challenge.goalValue; // Cap at goal
          challenge.isCompleted = true;
          justCompleted = true;
        }
      }
      await this.userChallengesRepository.save(challenge);
      if (justCompleted) {
          completed.push(challenge);
      }
    }
    return completed;
  }

  async claimReward(userId: string, userChallengeId: string) {
    const challenge = await this.userChallengesRepository.findOne({
      where: { id: userChallengeId, userId },
    });

    if (!challenge) throw new NotFoundException('Challenge not found');
    if (!challenge.isCompleted) throw new BadRequestException('Challenge not completed yet');
    if (challenge.isClaimed) throw new BadRequestException('Reward already claimed');

    const profile = await this.profileRepository.findOne({ where: { id: userId } });
    if (profile) {
      profile.xp += challenge.rewardXp;
      profile.gems += challenge.rewardGems;
      await this.profileRepository.save(profile);
    }

    challenge.isClaimed = true;
    await this.userChallengesRepository.save(challenge);

    return { 
      success: true, 
      xp: challenge.rewardXp, 
      gems: challenge.rewardGems,
      newTotalXp: profile?.xp,
      newTotalGems: profile?.gems
    };
  }
}
