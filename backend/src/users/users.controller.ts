import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('sync')
  async syncUser(@Request() req, @Body() body: { level: 'Beginner' | 'Intermediate' | 'Pro' }) {
    const userId = req.user.userId;
    return this.usersService.syncProfile(userId, body.level);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.userId);
  }
}
