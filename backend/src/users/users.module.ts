import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Profile } from '../entities/profile.entity';
import { UserSubmission } from '../entities/user-submission.entity';
import { Friendship } from '../entities/friendship.entity';
import { QuotesModule } from '../quotes/quotes.module';
import { ChallengesModule } from '../challenges/challenges.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile, UserSubmission, Friendship]),
    QuotesModule,
    ChallengesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
