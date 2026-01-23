import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SnippetsService } from './snippets.service';
import { FormatService } from './format.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('snippets')
export class SnippetsController {
  constructor(
    private readonly snippetsService: SnippetsService,
    private readonly formatService: FormatService
  ) {}

  @Post('share')
  @UseGuards(AuthGuard('jwt'))
  async share(@Body() body: any, @Request() req) {
    return this.snippetsService.createSnippet(body, req.user);
  }

  @Get(':code')
  @UseGuards(AuthGuard('jwt'))
  async get(@Param('code') code: string) {
    return this.snippetsService.getSnippet(code);
  }

  @Patch(':code')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('code') code: string, @Body() body: { code: string; language: string }) {
    return this.snippetsService.updateSnippet(code, body);
  }

  @Post('run')
  async run(@Body() body: { language: string; code: string }) {
    return this.snippetsService.runCode(body.language, body.code);
  }

  @Post('format')
  async format(@Body() body: { language: string; code: string }) {
    const formatted = await this.formatService.formatCode(body.language, body.code);
    return { formatted };
  }
}
