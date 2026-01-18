import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  private readonly logger = new Logger(QuestionsController.name);

  constructor(private readonly questionsService: QuestionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('placement')
  async getPlacement(@Request() req) {
    const languageId = req.query.languageId;
    if (!languageId) throw new Error('Language ID required');
    return this.questionsService.getPlacementQuestions(languageId);
  }

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

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Request() req, @Body() body: any) {
    return this.questionsService.createCustomQuestion(body, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.questionsService.findOne(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async update(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.questionsService.updateCustomQuestion(id, body, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('search')
  async search(@Request() req) {
    return this.questionsService.searchQuestions(req.user.userId, {
      title: req.query.title,
      qType: req.query.qType,
      languageId: req.query.languageId,
      onlyMine: req.query.onlyMine === 'true',
    });
  }
}
