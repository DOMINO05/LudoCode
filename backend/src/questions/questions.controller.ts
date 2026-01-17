import { Controller, Get, UseGuards, Request, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  private readonly logger = new Logger(QuestionsController.name);

  constructor(private readonly questionsService: QuestionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('next')
  async getNext(@Request() req) {
    const languageId = req.query.languageId;
    const type = req.query.type;
    // Default or Error if no languageId?
    // Let's assume frontend sends it. If not, throw error or default (hard to default if dynamic).
    // Or fetch user's preferred language.
    // For now, assume param.
    if (!languageId) throw new Error('Language ID required');

    const question = await this.questionsService.getNextQuestion(
      req.user.userId,
      languageId,
      type,
    );
    this.logger.log(
      `Serving question to user ${req.user.userId} (Lang: ${languageId}): ${JSON.stringify(question)}`,
    );
    return question;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('random')
  async getRandomByType(@Request() req) {
    const type = req.query.type;
    const languageId = req.query.languageId;
    const question = await this.questionsService.getRandomQuestionByType(
      type,
      languageId,
    );
    return question;
  }
}
