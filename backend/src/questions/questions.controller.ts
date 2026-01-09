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
    const question = await this.questionsService.getNextQuestion(req.user.userId);
    this.logger.log(`Serving question to user ${req.user.userId}: ${JSON.stringify(question)}`);
    return question;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('random')
  async getRandomByType(@Request() req) {
    const type = req.query.type;
    const question = await this.questionsService.getRandomQuestionByType(type);
    return question;
  }
}
