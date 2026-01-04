import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('next')
  async getNext(@Request() req) {
    return this.questionsService.getNextQuestion(req.user.userId);
  }
}
