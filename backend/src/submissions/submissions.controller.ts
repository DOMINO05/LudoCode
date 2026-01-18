import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
  Get,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubmissionsService } from './submissions.service';
import { User, UserPayload } from '../common/decorators/user.decorator';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Controller('questions')
export class SubmissionsController {
  private readonly logger = new Logger(SubmissionsController.name);

  constructor(private readonly submissionsService: SubmissionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/submit')
  async submit(
    @User() user: UserPayload,
    @Param('id') questionId: string,
    @Body() body: SubmitAnswerDto,
  ) {
    const userId = user.userId;
    const executionTimeMs = body.executionTimeMs || 0;
    const streak = body.streak || 0;
    this.logger.log(
      `User ${userId} submitting answer for question ${questionId}. Code: ${body.code}, Streak: ${streak}`,
    );

    const result = await this.submissionsService.submit(
      userId,
      questionId,
      body.code,
      executionTimeMs,
      streak,
    );

    this.logger.log(
      `Submission result for user ${userId}, question ${questionId}: ${JSON.stringify(result)}`,
    );
    return result;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('mistake-recovery')
  async getMistakeRecovery(@User() user: UserPayload) {
    return this.submissionsService.getOldestUnresolvedMistake(user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('resolve/:id')
  async resolveMistake(
    @User() user: UserPayload,
    @Param('id') submissionId: string,
    @Body() body: { code: string },
  ) {
    return this.submissionsService.resolveMistake(
      user.userId,
      submissionId,
      body.code,
    );
  }
}
