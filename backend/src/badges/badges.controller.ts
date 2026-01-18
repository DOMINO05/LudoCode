import { Controller, Get, UseGuards, Post } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BadgesService } from './badges.service';
import { User, UserPayload } from '../common/decorators/user.decorator';

@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  async getAllBadges() {
    return this.badgesService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  async getMyBadges(@User() user: UserPayload) {
    return this.badgesService.findUserBadges(user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('check')
  async checkMyBadges(@User() user: UserPayload) {
    return this.badgesService.checkAndAwardBadges(user.userId);
  }
}
