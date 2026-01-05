import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from '../entities/profile.entity';
import { DailyLogin } from '../entities/daily-login.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
    @InjectRepository(DailyLogin)
    private dailyLoginsRepository: Repository<DailyLogin>,
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
}
