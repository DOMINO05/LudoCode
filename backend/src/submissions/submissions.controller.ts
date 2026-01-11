import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
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
    this.logger.log(
      `User ${userId} submitting answer for question ${questionId}. Code: ${body.code}`,
    );

    const result = await this.submissionsService.submit(
      userId,
      questionId,
      body.code,
      executionTimeMs,
    );

    this.logger.log(
      `Submission result for user ${userId}, question ${questionId}: ${JSON.stringify(result)}`,
    );
    return result;
  }
}
