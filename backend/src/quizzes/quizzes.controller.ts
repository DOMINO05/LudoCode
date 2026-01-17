import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { User } from '../common/decorators/user.decorator';

@Controller('quizzes')
@UseGuards(AuthGuard('jwt'))
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  create(@Body() createQuizDto: CreateQuizDto, @User('userId') userId: string) {
    return this.quizzesService.create(createQuizDto, userId);
  }

  @Get('my-quizzes')
  findMyQuizzes(@User('userId') userId: string) {
    return this.quizzesService.findMyQuizzes(userId);
  }

  @Get('public')
  findPublicQuizzes() {
    return this.quizzesService.findPublicQuizzes();
  }

  @Get('code/:code')
  findByShareCode(@Param('code') code: string) {
    return this.quizzesService.findByShareCode(code);
  }

  @Get('my-attempts')
  getMyAttempts(@User('userId') userId: string) {
    return this.quizzesService.getMyAttempts(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @User('userId') userId: string) {
    return this.quizzesService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateQuizDto: UpdateQuizDto,
    @User('userId') userId: string,
  ) {
    return this.quizzesService.update(id, updateQuizDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @User('userId') userId: string) {
    return this.quizzesService.remove(id, userId);
  }

  @Post(':id/questions')
  addQuestion(
    @Param('id') id: string,
    @Body() addQuestionDto: AddQuestionDto,
    @User('userId') userId: string,
  ) {
    return this.quizzesService.addQuestion(id, addQuestionDto, userId);
  }

  @Delete(':id/questions/:questionId')
  removeQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @User('userId') userId: string,
  ) {
    return this.quizzesService.removeQuestion(id, questionId, userId);
  }

  @Put(':id/questions/order')
  updateQuestionOrder(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @User('userId') userId: string,
  ) {
    return this.quizzesService.updateQuestionOrder(id, updateOrderDto, userId);
  }

  @Post(':id/attempt')
  submitAttempt(
    @Param('id') id: string,
    @Body() submitAttemptDto: SubmitAttemptDto,
    @User('userId') userId: string,
  ) {
    return this.quizzesService.submitAttempt(id, submitAttemptDto, userId);
  }

  @Get(':id/results')
  getQuizResults(@Param('id') id: string, @User('userId') userId: string) {
    return this.quizzesService.getQuizResults(id, userId);
  }
}
