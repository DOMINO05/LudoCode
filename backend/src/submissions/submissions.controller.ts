import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubmissionsService } from './submissions.service';

@Controller('questions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/submit')
  async submit(@Request() req, @Param('id') questionId: string, @Body() body: { code: string }) {
    const userId = req.user.userId;
    return this.submissionsService.submit(userId, questionId, body.code);
  }
}
