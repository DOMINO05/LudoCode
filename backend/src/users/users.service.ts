import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Not } from 'typeorm';
import { Profile } from '../entities/profile.entity';
import { DailyLogin } from '../entities/daily-login.entity';
import { UserSubmission } from '../entities/user-submission.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
    @InjectRepository(DailyLogin)
    private dailyLoginsRepository: Repository<DailyLogin>,
    @InjectRepository(UserSubmission)
    private userSubmissionsRepository: Repository<UserSubmission>,
  ) {}

  async syncProfile(userId: string, level: 'Beginner' | 'Intermediate' | 'Pro' = 'Beginner'): Promise<Profile> {
    const existingProfile = await this.profilesRepository.findOne({ where: { id: userId } });
    if (existingProfile) {
      return existingProfile;
    }

    let initialElo = 1000;
    if (level === 'Beginner') initialElo = 800;
    else if (level === 'Intermediate') initialElo = 1200;
    else if (level === 'Pro') initialElo = 1600;

    const newProfile = this.profilesRepository.create({
      id: userId,
      globalEloRating: initialElo,
    });

    return this.profilesRepository.save(newProfile);
  }

  async getProfile(userId: string): Promise<Profile> {
    return this.profilesRepository.findOne({ where: { id: userId } });
  }

  async updateProfile(userId: string, updates: { username?: string; avatar_url?: string }): Promise<Profile> {
    const profile = await this.profilesRepository.findOne({ where: { id: userId } });
    if (!profile) throw new Error('User not found');

    if (updates.username && updates.username !== profile.username) {
        // Check uniqueness
        const existing = await this.profilesRepository.findOne({
            where: { username: updates.username, id: Not(userId) }
        });
        if (existing) {
            throw new ConflictException('Username already taken');
        }
        profile.username = updates.username;
    }

    if (updates.avatar_url) {
        profile.avatarUrl = updates.avatar_url;
    }

    return this.profilesRepository.save(profile);
  }

  async claimDailyBonus(userId: string): Promise<{ claimed: boolean; bonus?: number; message?: string }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already claimed today
    const existing = await this.dailyLoginsRepository.findOne({
      where: {
        userId: userId,
        loginDate: today,
      },
    });

    if (existing) {
      return { claimed: false, message: 'Mára már megkaptad' };
    }

    // Claim bonus
    // 1. Create DailyLogin record
    const dailyLogin = this.dailyLoginsRepository.create({
      userId: userId,
      loginDate: today,
    });
    await this.dailyLoginsRepository.save(dailyLogin);

    // 2. Add XP to user
    const profile = await this.profilesRepository.findOne({ where: { id: userId } });
    if (profile) {
      profile.xp += 50;
      await this.profilesRepository.save(profile);
    }

    return { claimed: true, bonus: 50 };
  }

  async getLeaderboard(): Promise<Profile[]> {
    return this.profilesRepository.find({
      order: {
        xp: 'DESC',
      },
      take: 10,
      select: ['id', 'username', 'xp', 'globalEloRating', 'avatarUrl', 'badges'],
    });
  }

  async getUserStats(userId: string) {
    const profile = await this.profilesRepository.findOne({ where: { id: userId } });
    if (!profile) throw new Error('User not found');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Include today
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Fetch submissions for activity count
    const recentSubmissions = await this.userSubmissionsRepository.find({
        where: {
            userId: userId,
            createdAt: MoreThanOrEqual(sevenDaysAgo),
        },
        order: { createdAt: 'ASC' }
    });

    // Calculate Activity (submissions per day)
    const activityMap = new Map<string, number>();
    // Initialize last 7 days with 0
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        activityMap.set(d.toISOString().split('T')[0], 0);
    }

    recentSubmissions.forEach(sub => {
        const dateStr = sub.createdAt.toISOString().split('T')[0];
        if (activityMap.has(dateStr)) {
            activityMap.set(dateStr, activityMap.get(dateStr) + 1);
        }
    });

    const activity = Array.from(activityMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));


    // Calculate ELO History
    const allRecentSubmissionsDesc = await this.userSubmissionsRepository.find({
        where: { userId: userId },
        order: { createdAt: 'DESC' },
        take: 100 // Limit to last 100 for performance, assuming user hasn't done >100 in 7 days. If they have, well, it's an approximation.
    });

    const eloHistory = [];
    let runningElo = profile.globalEloRating;
    
    // We need to calculate the "Sum of changes from Day X+1 to Today"
    // Let's filter submissions by date.
    
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i); // Today, Yesterday, ...
        const dateStr = d.toISOString().split('T')[0];
        
        const submissionsOnDay = allRecentSubmissionsDesc.filter(s => s.createdAt.toISOString().split('T')[0] === dateStr);
        const dayChange = submissionsOnDay.reduce((acc, sub) => acc + (sub.isCorrect ? 15 : -15), 0);
        
        eloHistory.unshift({ date: dateStr, elo: runningElo });
        
        // Prepare for next iteration (Yesterday): subtract today's change from running total
        runningElo -= dayChange;
    }

    return {
        activity,
        eloHistory
    };
  }

  async checkEasterEgg(userId: string, code: string): Promise<{ success: boolean; message?: string }> {
      if (code.toLowerCase() === 'ludo' || code.toLowerCase() === 'konami') {
          const profile = await this.profilesRepository.findOne({ where: { id: userId } });
          if (profile) {
              if (!profile.badges) profile.badges = [];
              if (!profile.badges.includes('Hacker')) {
                  profile.badges.push('Hacker');
                  await this.profilesRepository.save(profile);
                  return { success: true, message: 'Hacker Badge Unlocked!' };
              }
              return { success: true, message: 'Badge already unlocked.' };
          }
      }
      return { success: false };
  }
}
