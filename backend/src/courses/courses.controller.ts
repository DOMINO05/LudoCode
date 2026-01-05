import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('progress')
  async getProgress(@Request() req) {
    return this.coursesService.getProgress(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':conceptId/next-question')
  async getNextQuestion(@Request() req, @Param('conceptId') conceptId: string) {
    return this.coursesService.getNextQuestionForConcept(req.user.userId, conceptId);
  }
}
