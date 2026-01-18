import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { User, UserPayload } from '../common/decorators/user.decorator';
import { SyncUserDto } from './dto/sync-user.dto';
import { EasterEggDto, UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('sync')
  async syncUser(@User() user: UserPayload, @Body() body: SyncUserDto) {
    return this.usersService.syncProfile(user.userId, body.level, body.username);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@User() user: UserPayload) {
    return this.usersService.getProfile(user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('daily-claim')
  async claimDailyBonus(@User() user: UserPayload) {
    return this.usersService.claimDailyBonus(user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('leaderboard')
  async getLeaderboard(
    @User() user: UserPayload,
    @Query('type') type: 'global' | 'friends',
  ) {
    return this.usersService.getLeaderboard(type, user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('search')
  async searchUsers(@User() user: UserPayload, @Query('q') query: string) {
    return this.usersService.searchUsers(query, user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('follow/:id')
  async followUser(@User() user: UserPayload, @Param('id') id: string) {
    await this.usersService.followUser(user.userId, id);
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('follow/:id')
  async unfollowUser(@User() user: UserPayload, @Param('id') id: string) {
    await this.usersService.unfollowUser(user.userId, id);
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('stats')
  async getUserStats(@User() user: UserPayload) {
    return this.usersService.getUserStats(user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  async updateProfile(
    @User() user: UserPayload,
    @Body() body: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('easter-egg')
  async easterEgg(@User() user: UserPayload, @Body() body: EasterEggDto) {
    return this.usersService.checkEasterEgg(user.userId, body.code);
  }
}
