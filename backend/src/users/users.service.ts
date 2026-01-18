import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Not, In, Like } from 'typeorm';
import { Profile } from '../entities/profile.entity';
import { UserSubmission } from '../entities/user-submission.entity';
import { Friendship } from '../entities/friendship.entity';
import { QuotesService } from '../quotes/quotes.service';
import { ChallengesService } from '../challenges/challenges.service';

const AVATAR_OPTIONS = {
  skinColor: ['ffe4c0', 'f5d0a9', 'e8b88d', 'd49d7b', 'b67b5e', '8d5441', '5d3428'],
  hairColor: ['000000', '4a4a4a', 'ffffff', 'b8b8b8', '8d2a2a', 'c54b29', 'e2ba4f', '6a4e23', '3b6e85'],
  backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', 'ffffff', '65c9ff', '58cc02', '1a1a1a', 'transparent'],
  hair: [
    'short01', 'short02', 'short03', 'short04', 'short05', 'short06', 'short07', 'short08',
    'short09', 'short10', 'short11', 'short12', 'short13', 'short14', 'short15', 'short16',
    'short17', 'short18', 'short19', 'short20', 'short21', 'short22', 'short23', 'short24',
    'long01', 'long02', 'long03', 'long04', 'long05', 'long06', 'long07', 'long08',
    'long09', 'long10', 'long11', 'long12', 'long13', 'long14', 'long15', 'long16',
    'long17', 'long18', 'long19', 'long20', 'long21'
  ],
  eyes: [
    'variant01', 'variant02', 'variant03', 'variant04', 'variant05', 'variant06',
    'variant07', 'variant08', 'variant09', 'variant10', 'variant11', 'variant12'
  ],
  mouth: [
    'happy01', 'happy02', 'happy03', 'happy04', 'happy05', 'happy06', 'happy07',
    'happy08', 'happy09', 'happy10', 'happy11', 'happy12', 'happy13',
    'sad01', 'sad02', 'sad03', 'sad04', 'sad05', 'sad06', 'sad07', 'sad08', 'sad09', 'sad10'
  ],
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
    @InjectRepository(UserSubmission)
    private userSubmissionsRepository: Repository<UserSubmission>,
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    private quotesService: QuotesService,
    private challengesService: ChallengesService,
  ) {}

  async syncProfile(
    userId: string,
    level: 'Beginner' | 'Intermediate' | 'Pro' = 'Beginner',
    username?: string,
  ): Promise<Profile> {
    const existingProfile = await this.profilesRepository.findOne({
      where: { id: userId },
    });
    if (existingProfile) {
      // Check if we need to backfill data (e.g. if created by trigger without details)
      let changed = false;
      if (!existingProfile.avatarConfig) {
        existingProfile.avatarConfig = this.generateRandomAvatarConfig(userId);
        changed = true;
      }
      if (username && username.trim().length > 0 && existingProfile.username !== username.trim()) {
        existingProfile.username = username.trim();
        changed = true;
      }

      if (changed) {
        return await this.profilesRepository.save(existingProfile);
      }
      return existingProfile;
    }

    let initialProficiency = 0.0;
    if (level === 'Beginner') initialProficiency = -2.0;
    else if (level === 'Intermediate') initialProficiency = 0.0;
    else if (level === 'Pro') initialProficiency = 2.0;

    const newProfile = this.profilesRepository.create({
      id: userId,
      username: username ? username.trim() : null,
      globalProficiency: initialProficiency,
      hasCompletedPlacement: false,
      sanityPoints: 100,
      gems: 0,
      xp: 0,
      currentStreak: 0,
      avatarConfig: this.generateRandomAvatarConfig(userId),
    });

    try {
      return await this.profilesRepository.save(newProfile);
    } catch (err) {
      // Handle race condition: if another request created it just now
      if (err.code === '23505') {
        const p = await this.profilesRepository.findOne({ where: { id: userId } });
        if (p) return p;
      }
      throw err;
    }
  }

  async getProfile(userId: string): Promise<Profile> {
    const profile = await this.profilesRepository.findOne({
      where: { id: userId },
      relations: ['lastQuote', 'userBadges', 'userBadges.badge'],
    });
    if (!profile) {
      // Auto-sync/create profile if missing (e.g. after DB reset)
      return this.syncProfile(userId);
    }
    return profile;
  }

  async updateProfile(
    userId: string,
    updates: { username?: string; bio?: string; avatar_config?: any },
  ): Promise<Profile> {
    const profile = await this.profilesRepository.findOne({
      where: { id: userId },
    });
    if (!profile) throw new Error('User not found');

    if (updates.bio !== undefined) {
      profile.bio = updates.bio;
    }

    if (updates.username && updates.username !== profile.username) {
      // Check uniqueness
      const existing = await this.profilesRepository.findOne({
        where: { username: updates.username, id: Not(userId) },
      });
      if (existing) {
        throw new ConflictException('Username already taken');
      }
      profile.username = updates.username;
    }

    if (updates.avatar_config) {
      profile.avatarConfig = updates.avatar_config;
      await this.challengesService.updateProgress(userId, 'CUSTOMIZE_AVATAR', 1);
    }

    return this.profilesRepository.save(profile);
  }

  async claimDailyBonus(
    userId: string,
  ): Promise<{ claimed: boolean; bonus?: number; message?: string; quote?: any }> {
    const today = new Date().toISOString().split('T')[0];

    // Ensure profile exists first
    let profile = await this.profilesRepository.findOne({
      where: { id: userId },
    });
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

    // Update Challenges (Streak)
    await this.challengesService.updateProgress(userId, 'STREAK', profile.currentStreak);

    let xpBonus = 50;
    let gemBonus = 5;
    let message = 'Napi bónusz bezsebelve!';

    // 5-day Streak Bonus
    if (profile.currentStreak > 0 && profile.currentStreak % 5 === 0) {
        xpBonus += 100;
        gemBonus += 10;
        message = `🔥 ${profile.currentStreak} napos streak! Extra jutalom: +100 XP, +10 Gem!`;
    }

    profile.lastDailyBonus = today;
    profile.xp += xpBonus;
    profile.gems += gemBonus;
    profile.sanityPoints = Math.min(100, profile.sanityPoints + 20); // Restore Sanity

    const quote = await this.quotesService.getRandomQuote();
    profile.lastQuoteId = quote.id;

    await this.profilesRepository.save(profile);

    return { claimed: true, bonus: xpBonus, message, quote };
  }

  async getLeaderboard(
    type: 'global' | 'friends' = 'global',
    userId?: string,
  ): Promise<any[]> {
    if (type === 'global') {
      const users = await this.profilesRepository.find({
        order: {
          xp: 'DESC',
        },
        take: 20, // Increased to see more people
        select: ['id', 'username', 'xp', 'globalProficiency', 'currentStreak'],
      });
      // Append isFollowing flag if userId is provided
      if (userId) {
        const friendships = await this.friendshipRepository.find({
          where: { followerId: userId },
        });
        const followingIds = new Set(friendships.map((f) => f.followingId));
        return users.map((u) => ({
          ...u,
          isFollowing: followingIds.has(u.id),
        }));
      }
      return users;
    } else {
      if (!userId) throw new Error('User ID required for friend leaderboard');

      const friendships = await this.friendshipRepository.find({
        where: { followerId: userId },
      });
      const followingIds = friendships.map((f) => f.followingId);
      // Include self
      followingIds.push(userId);

      if (followingIds.length === 0) {
        return [];
      }

      const friends = await this.profilesRepository.find({
        where: { id: In(followingIds) },
        order: {
          xp: 'DESC',
        },
        select: ['id', 'username', 'xp', 'globalProficiency', 'currentStreak'],
      });
      
      return friends.map(u => ({
          ...u,
          isFollowing: u.id !== userId // Assume friends are followed (except self)
      }));
    }
  }

  async searchUsers(query: string, userId: string): Promise<any[]> {
      if (!query || query.length < 2) return [];
      
      const users = await this.profilesRepository.find({
          where: { username: Like(`%${query}%`) },
          take: 10,
          select: ['id', 'username', 'xp', 'globalProficiency', 'avatarConfig'],
      });

      // Filter out self if needed, or keep to show self
      // Check following status
      const friendships = await this.friendshipRepository.find({
          where: { followerId: userId },
      });
      const followingIds = new Set(friendships.map(f => f.followingId));

      return users.map(u => ({
          ...u,
          isFollowing: followingIds.has(u.id),
          isSelf: u.id === userId
      }));
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new ConflictException('Cannot follow self');
    }

    const targetUser = await this.profilesRepository.findOne({
      where: { id: followingId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.friendshipRepository.findOne({
      where: { followerId, followingId },
    });
    if (existing) return;

    const friendship = this.friendshipRepository.create({
      followerId,
      followingId,
    });
    await this.friendshipRepository.save(friendship);
  }

  async unfollowUser(followerId: string, followingId: string) {
    await this.friendshipRepository.delete({ followerId, followingId });
  }

  async getPublicProfile(targetUserId: string, requesterId: string) {
    const profile = await this.profilesRepository.findOne({
      where: { id: targetUserId },
      relations: ['userBadges', 'userBadges.badge'],
    });

    if (!profile) {
       throw new NotFoundException('User not found');
    }

    const followersCount = await this.friendshipRepository.count({
      where: { followingId: targetUserId },
    });
    const followingCount = await this.friendshipRepository.count({
      where: { followerId: targetUserId },
    });

    let isFollowing = false;
    if (requesterId && requesterId !== targetUserId) {
        const friendship = await this.friendshipRepository.findOne({
            where: { followerId: requesterId, followingId: targetUserId }
        });
        isFollowing = !!friendship;
    }

    const stats = await this.getUserStats(targetUserId);

    return {
      ...profile,
      followersCount,
      followingCount,
      isFollowing,
      stats
    };
  }

  async getUserStats(userId: string) {
    const profile = await this.profilesRepository.findOne({
      where: { id: userId },
    });
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
      order: { createdAt: 'ASC' },
    });

    // Calculate Activity (submissions per day)
    const activityMap = new Map<string, number>();
    // Initialize last 7 days with 0
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      activityMap.set(d.toISOString().split('T')[0], 0);
    }

    recentSubmissions.forEach((sub) => {
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
      take: 100,
    });

    const proficiencyHistory = [];
    let runningProficiency = profile.globalProficiency;

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i); // Today, Yesterday, ...
      const dateStr = d.toISOString().split('T')[0];

      const submissionsOnDay = allRecentSubmissionsDesc.filter(
        (s) => s.createdAt.toISOString().split('T')[0] === dateStr,
      );
      // Reverse engineer the change: Correct = +0.05, Incorrect = 0 (we only penalize sanity, not proficiency, for now in SubmissionsService, though in reality IRT should drop)
      // SubmissionsService logic was: correct -> +0.05. Incorrect -> no change to proficiency (only sanity).
      const dayChange = submissionsOnDay.reduce(
        (acc, sub) => acc + (sub.isCorrect ? 0.05 : 0),
        0,
      );

      proficiencyHistory.unshift({
        date: dateStr,
        value: Number(runningProficiency.toFixed(2)),
      });

      // Prepare for next iteration (Yesterday)
      runningProficiency -= dayChange;
    }

    return {
      activity,
      proficiencyHistory,
    };
  }

  private generateRandomAvatarConfig(userId: string) {
    const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    
    return {
      skinColor: getRandom(AVATAR_OPTIONS.skinColor),
      hairColor: getRandom(AVATAR_OPTIONS.hairColor),
      backgroundColor: getRandom(AVATAR_OPTIONS.backgroundColor),
      hair: getRandom(AVATAR_OPTIONS.hair),
      eyes: getRandom(AVATAR_OPTIONS.eyes),
      mouth: getRandom(AVATAR_OPTIONS.mouth),
      clothing: 'variant01', // Default basic clothing
      seed: userId,
    };
  }

  async completePlacement(userId: string, proficiency?: number): Promise<Profile> {
    const profile = await this.profilesRepository.findOne({ where: { id: userId } });
    if (!profile) throw new NotFoundException('User not found');

    profile.hasCompletedPlacement = true;
    if (proficiency !== undefined) {
      profile.globalProficiency = proficiency;
    }
    return this.profilesRepository.save(profile);
  }

  async checkEasterEgg(
    userId: string,
    code: string,
  ): Promise<{ success: boolean; message?: string }> {
    if (code.toLowerCase() === 'ludo' || code.toLowerCase() === 'konami') {
      const profile = await this.profilesRepository.findOne({
        where: { id: userId },
      });
      if (profile) {
        // Grant gems instead of badge
        profile.gems += 50;
        await this.profilesRepository.save(profile);
        return {
          success: true,
          message: 'Cheat Code Activated: 50 Gems added!',
        };
      }
    }
    return { success: false };
  }
}
