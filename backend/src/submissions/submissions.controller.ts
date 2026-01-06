import { Controller, Post, Body, Param, UseGuards, Request, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubmissionsService } from './submissions.service';

@Controller('questions')
export class SubmissionsController {
  private readonly logger = new Logger(SubmissionsController.name);

  constructor(private readonly submissionsService: SubmissionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/submit')
  async submit(@Request() req, @Param('id') questionId: string, @Body() body: { code: string }) {
    const userId = req.user.userId;
    this.logger.log(`User ${userId} submitting answer for question ${questionId}. Code: ${body.code}`);
    
    const result = await this.submissionsService.submit(userId, questionId, body.code);
    
    this.logger.log(`Submission result for user ${userId}, question ${questionId}: ${JSON.stringify(result)}`);
    return result;
  }
}
