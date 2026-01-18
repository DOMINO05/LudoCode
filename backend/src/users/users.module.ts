import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Profile } from '../entities/profile.entity';
import { UserSubmission } from '../entities/user-submission.entity';
import { Friendship } from '../entities/friendship.entity';
import { QuotesModule } from '../quotes/quotes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile, UserSubmission, Friendship]),
    QuotesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
