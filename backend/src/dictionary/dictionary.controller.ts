import { Controller, Get } from '@nestjs/common';
import { DictionaryService } from './dictionary.service';
import { DictionaryEntry } from '../entities/dictionary.entity';

@Controller('dictionary')
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  @Get()
  findAll(): Promise<DictionaryEntry[]> {
    return this.dictionaryService.findAll();
  }
}
