import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from '../entities/profile.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
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
}
