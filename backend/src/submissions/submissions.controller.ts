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

    let codeLog = body.code;
    if (body.code && typeof body.code === 'string' && body.code.length > 100) {
      codeLog = `${body.code.substring(0, 100)}...`;
    }

    this.logger.log(
      `--- Submission ---\n` +
        `User: ${userId}\n` +
        `Question: ${questionId}\n` +
        `Streak: ${streak}\n` +
        `Code: ${codeLog}`,
    );

    const result: any = await this.submissionsService.submit(
      userId,
      questionId,
      body.code,
      executionTimeMs,
      streak,
      body.isPlacement,
    );

    let resultLog = `--- Result ---\n` + `Correct: ${result.isCorrect}\n`;

    if (result.isCorrect) {
      if (result.userUpdates) {
        resultLog += `XP: ${result.userUpdates.xp}\n`;
      }
      if (result.newBadges?.length) {
        resultLog += `New Badges: ${result.newBadges.map((b) => b.name).join(', ')}\n`;
      }
    } else {
      resultLog += `Output: ${result.output || 'N/A'}\n`;
      if (result.explanation) {
        resultLog += `Explanation: ${result.explanation}\n`;
      }
      if (result.correct_answer) {
        resultLog += `Correct Answer: ${result.correct_answer}\n`;
      }
      if (result.ai_explanation) {
        resultLog += `AI Explanation: ${result.ai_explanation}\n`;
      }
      if (result.hint) {
        resultLog += `Hint: ${result.hint}\n`;
      }
    }
    resultLog += `--------------`;

    this.logger.log(resultLog);
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
