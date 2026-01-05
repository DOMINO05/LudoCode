import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
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
      select: ['id', 'username', 'xp', 'globalEloRating'], // Select only needed fields (assuming id needed for identifying current user)
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
    // We need to walk backwards from current ELO
    // Fetch ALL submissions descending to reconstruct history accurately for the last 7 days
    // Optimization: Just fetch enough to cover 7 days? No, we need all to trace back to 7 days ago if we want to be precise, 
    // OR we just fetch recent ones and assume we start from (Current - ChangeOfRecent).
    
    const allRecentSubmissionsDesc = await this.userSubmissionsRepository.find({
        where: { userId: userId },
        order: { createdAt: 'DESC' },
        take: 100 // Limit to last 100 for performance, assuming user hasn't done >100 in 7 days. If they have, well, it's an approximation.
    });

    const eloHistoryMap = new Map<string, number>();
    // Initialize last 7 days
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        eloHistoryMap.set(d.toISOString().split('T')[0], null);
    }

    let currentCalculatedElo = profile.globalEloRating;
    
    // Set today's ELO
    const todayStr = new Date().toISOString().split('T')[0];
    eloHistoryMap.set(todayStr, currentCalculatedElo);

    // Walk back
    for (const sub of allRecentSubmissionsDesc) {
        const subDateStr = sub.createdAt.toISOString().split('T')[0];
        
        // Before undoing this submission, the ELO was 'currentCalculatedElo'.
        // So for this date, the ELO *at the end of the day* is what we have now (or what we had before we process submissions from the SAME day).
        // Actually, simpler:
        // We want the ELO at the END of each day.
        // So if we encounter a submission from Day X, and we haven't set Day X's ELO yet, it means this is the LAST submission of Day X.
        // So Day X's ELO = currentCalculatedElo.
        
        if (eloHistoryMap.has(subDateStr) && eloHistoryMap.get(subDateStr) === null) {
             eloHistoryMap.set(subDateStr, currentCalculatedElo);
        }

        // Undo the change
        // CodingPage logic: Correct = +15, Incorrect = -15
        // So previous was: Current - 15 (if correct) or Current + 15 (if incorrect)
        const change = sub.isCorrect ? 15 : -15;
        currentCalculatedElo -= change;
    }

    // Fill in gaps (dates with no submissions should have same ELO as previous day, or next day if walking back?)
    // Since we walked back, any nulls mean no submissions happened on that day or after that day (within the range).
    // If we have nulls, it means we didn't encounter a submission for that day.
    // The ELO for that day should be the same as the ELO for the *next* day (future), because no change happened.
    // So we fill nulls with the value from the 'next' day (which we calculated earlier).
    
    const sortedDates = Array.from(eloHistoryMap.keys()).sort(); // Oldest to newest
    // Forward pass to fill? No, we walked backwards.
    // Let's use the array.
    // If today (index 6) is set. Yesterday (index 5) is null. It means no submissions yesterday. So Yesterday's ELO = Today's ELO? No.
    // It means Yesterday's ELO is same as the day BEFORE yesterday.
    // Wait. If I did no submissions today, my ELO is same as yesterday.
    // So if I walk back:
    // Today (no sub) -> ELO is same as Yesterday.
    // ...
    // Let's restart the fill logic.
    // We have `currentCalculatedElo` which is now roughly the ELO at the start of the window (or before the last processed submission).
    
    // Let's construct the array from oldest to newest.
    // Start with the ELO calculated after walking back past the window.
    // But we might not have walked back past the whole window if submissions are sparse.
    // The `currentCalculatedElo` after the loop is the ELO before the oldest submission we processed.
    
    // Alternative:
    // Just map the days.
    // For each day, find the ELO at the end of that day.
    // ELO at end of Day X = CurrentELO - (Sum of changes from Day X+1 to Today).
    
    const eloHistory = [];
    let runningElo = profile.globalEloRating;
    
    // We need to calculate the "Sum of changes from Day X+1 to Today"
    // Let's filter submissions by date.
    
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i); // Today, Yesterday, ...
        const dateStr = d.toISOString().split('T')[0];
        
        // Find changes that happened ON this day (and after this day in the loop?)
        // No, we want ELO at end of Day D.
        // ELO_End_D = ELO_End_D+1 - (Changes on Day D+1)
        // ELO_End_Today = Current
        // ELO_End_Yesterday = Current - (Changes Today)
        
        // Calculate changes for `dateStr`
        // Note: `allRecentSubmissionsDesc` contains submissions.
        // We need changes that happened ON `dateStr` (in UTC or local? Assuming UTC for simplicity as stored in DB)
        
        // But wait, the loop logic above: `runningElo` starts at current.
        // Before moving to Yesterday, we subtract Today's changes.
        
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
}
