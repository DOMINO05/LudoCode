import {
  Controller,
  Get,
  Param,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CoursesService } from './courses.service';
import { User, UserPayload } from '../common/decorators/user.decorator';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('progress')
  async getProgress(
    @User() user: UserPayload,
    @Query('languageId') languageId: string,
  ) {
    if (!languageId) throw new BadRequestException('Language ID required');
    return this.coursesService.getProgress(user.userId, languageId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':conceptId/next-question')
  async getNextQuestion(
    @User() user: UserPayload,
    @Param('conceptId') conceptId: string,
    @Query('languageId') languageId: string,
  ) {
    if (!languageId) throw new BadRequestException('Language ID required');
    return this.coursesService.getNextQuestionForConcept(
      user.userId,
      conceptId,
      languageId,
    );
  }
}
