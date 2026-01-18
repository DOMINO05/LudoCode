import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from '../entities/badge.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { Profile } from '../entities/profile.entity';
import { UserSubmission } from '../entities/user-submission.entity';

@Injectable()
export class BadgesService {
  constructor(
    @InjectRepository(Badge)
    private badgesRepository: Repository<Badge>,
    @InjectRepository(UserBadge)
    private userBadgesRepository: Repository<UserBadge>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(UserSubmission)
    private userSubmissionRepository: Repository<UserSubmission>,
  ) {}

  async findAll(): Promise<Badge[]> {
    return this.badgesRepository.find();
  }

  async findUserBadges(userId: string): Promise<UserBadge[]> {
    return this.userBadgesRepository.find({
      where: { userId },
      relations: ['badge'],
      order: { awardedAt: 'DESC' },
    });
  }

  async checkAndAwardBadges(userId: string): Promise<UserBadge[]> {
    const profile = await this.profileRepository.findOne({
      where: { id: userId },
    });

    if (!profile) return [];

    const allBadges = await this.badgesRepository.find();
    const existingUserBadges = await this.userBadgesRepository.find({
      where: { userId },
    });
    const existingBadgeIds = new Set(existingUserBadges.map((ub) => ub.badgeId));

    const newlyAwarded: UserBadge[] = [];

    for (const badge of allBadges) {
      if (existingBadgeIds.has(badge.id)) continue;

      let qualified = false;
      switch (badge.criteriaType) {
        case 'XP':
          qualified = profile.xp >= badge.criteriaValue;
          break;
        case 'GEMS':
          qualified = profile.gems >= badge.criteriaValue;
          break;
        case 'STREAK':
          qualified = profile.currentStreak >= badge.criteriaValue;
          break;
        case 'PROFICIENCY':
          qualified = profile.globalProficiency >= badge.criteriaValue;
          break;
        case 'SUBMISSIONS':
          const submissionCount = await this.userSubmissionRepository.count({
            where: { userId, isCorrect: true },
          });
          qualified = submissionCount >= badge.criteriaValue;
          break;
      }

      if (qualified) {
        const ub = this.userBadgesRepository.create({
          userId,
          badgeId: badge.id,
        });
        await this.userBadgesRepository.save(ub);
        ub.badge = badge; // Manually assign the badge relation so it's available in the return value
        newlyAwarded.push(ub);
      }
    }

    return newlyAwarded;
  }
}
