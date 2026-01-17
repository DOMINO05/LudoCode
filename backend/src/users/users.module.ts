import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Profile } from '../entities/profile.entity';
import { UserSubmission } from '../entities/user-submission.entity';
import { Friendship } from '../entities/friendship.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Profile, UserSubmission, Friendship])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
