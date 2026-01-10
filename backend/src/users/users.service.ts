import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Not } from 'typeorm';
import { Profile } from '../entities/profile.entity';
import { UserSubmission } from '../entities/user-submission.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
    @InjectRepository(UserSubmission)
    private userSubmissionsRepository: Repository<UserSubmission>,
  ) {}

  async syncProfile(userId: string, level: 'Beginner' | 'Intermediate' | 'Pro' = 'Beginner'): Promise<Profile> {
    const existingProfile = await this.profilesRepository.findOne({ where: { id: userId } });
    if (existingProfile) {
      return existingProfile;
    }

    let initialProficiency = 0.0;
    if (level === 'Beginner') initialProficiency = -2.0;
    else if (level === 'Intermediate') initialProficiency = 0.0;
    else if (level === 'Pro') initialProficiency = 2.0;

    const newProfile = this.profilesRepository.create({
      id: userId,
      globalProficiency: initialProficiency,
      sanityPoints: 100,
      gems: 0,
      xp: 0,
      currentStreak: 0
    });

    return this.profilesRepository.save(newProfile);
  }

  async getProfile(userId: string): Promise<Profile> {
    const profile = await this.profilesRepository.findOne({ where: { id: userId } });
    if (!profile) {
        // Auto-sync/create profile if missing (e.g. after DB reset)
        return this.syncProfile(userId);
    }
    return profile;
  }

  async updateProfile(userId: string, updates: { username?: string }): Promise<Profile> {
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

    return this.profilesRepository.save(profile);
  }

  async claimDailyBonus(userId: string): Promise<{ claimed: boolean; bonus?: number; message?: string }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Ensure profile exists first
    let profile = await this.profilesRepository.findOne({ where: { id: userId } });
    if (!profile) {
        profile = await this.syncProfile(userId);
    }

    // Check if already claimed today
    if (profile.lastDailyBonus === today) {
        return { claimed: false, message: 'Mára már megkaptad' };
    }

    // Update Streak logic
    // If last claim was yesterday, increment. If older, reset to 1.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (profile.lastDailyBonus === yesterdayStr) {
        profile.currentStreak += 1;
    } else {
        profile.currentStreak = 1;
    }

    profile.lastDailyBonus = today;
    profile.xp += 50;
    profile.gems += 5; 
    profile.sanityPoints = Math.min(100, profile.sanityPoints + 20); // Restore Sanity

    await this.profilesRepository.save(profile);

    return { claimed: true, bonus: 50 };
  }

  async getLeaderboard(): Promise<Profile[]> {
    return this.profilesRepository.find({
      order: {
        xp: 'DESC',
      },
      take: 10,
      select: ['id', 'username', 'xp', 'globalProficiency', 'currentStreak'],
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


    // Calculate Proficiency History (Approximation)
    const allRecentSubmissionsDesc = await this.userSubmissionsRepository.find({
        where: { userId: userId },
        order: { createdAt: 'DESC' },
        take: 100 
    });

    const proficiencyHistory = [];
    let runningProficiency = profile.globalProficiency;
    
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i); // Today, Yesterday, ...
        const dateStr = d.toISOString().split('T')[0];
        
        const submissionsOnDay = allRecentSubmissionsDesc.filter(s => s.createdAt.toISOString().split('T')[0] === dateStr);
        // Reverse engineer the change: Correct = +0.05, Incorrect = 0 (we only penalize sanity, not proficiency, for now in SubmissionsService, though in reality IRT should drop)
        // SubmissionsService logic was: correct -> +0.05. Incorrect -> no change to proficiency (only sanity).
        const dayChange = submissionsOnDay.reduce((acc, sub) => acc + (sub.isCorrect ? 0.05 : 0), 0);
        
        proficiencyHistory.unshift({ date: dateStr, value: Number(runningProficiency.toFixed(2)) });
        
        // Prepare for next iteration (Yesterday)
        runningProficiency -= dayChange;
    }

    return {
        activity,
        proficiencyHistory
    };
  }

  async checkEasterEgg(userId: string, code: string): Promise<{ success: boolean; message?: string }> {
      if (code.toLowerCase() === 'ludo' || code.toLowerCase() === 'konami') {
          const profile = await this.profilesRepository.findOne({ where: { id: userId } });
          if (profile) {
              // Grant gems instead of badge
              profile.gems += 50;
              await this.profilesRepository.save(profile);
              return { success: true, message: 'Cheat Code Activated: 50 Gems added!' };
          }
      }
      return { success: false };
  }
}
