import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChallengesService } from './challenges.service';
import { User, UserPayload } from '../common/decorators/user.decorator';

@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('my-active')
  async getActiveChallenges(@User() user: UserPayload) {
    return this.challengesService.getActiveChallenges(user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('claim/:id')
  async claimReward(@User() user: UserPayload, @Param('id') id: string) {
    return this.challengesService.claimReward(user.userId, id);
  }
}
