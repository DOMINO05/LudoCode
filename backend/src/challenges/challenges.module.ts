import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { ChallengeTemplate } from '../entities/challenge-template.entity';
import { UserChallenge } from '../entities/user-challenge.entity';
import { Profile } from '../entities/profile.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([ChallengeTemplate, UserChallenge, Profile]),
  ],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
