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
    // Check and generate if needed
    await this.ensureDailyChallenges(userId);
    await this.ensureWeeklyChallenges(userId);

    const now = new Date();
    return this.userChallengesRepository.find({
      where: { 
        userId, 
        expiresAt: MoreThanOrEqual(now)
      },
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

    // Generate 3 random daily challenges
    const dailyTemplates = await this.templatesRepository.find({ where: { period: 'DAILY' } });
    if (dailyTemplates.length === 0) return;

    const shuffled = dailyTemplates.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

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
    // Get start of week (Monday)
    const day = now.getDay(); 
    const diff = now.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0,0,0,0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const existing = await this.userChallengesRepository.count({
      where: {
        userId,
        template: { period: 'WEEKLY' },
        createdAt: MoreThanOrEqual(startOfWeek),
      },
      relations: ['template']
    });

    if (existing > 0) return;

    // Generate 2 random weekly challenges
    const weeklyTemplates = await this.templatesRepository.find({ where: { period: 'WEEKLY' } });
    if (weeklyTemplates.length === 0) return;

    const shuffled = weeklyTemplates.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 2);

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
