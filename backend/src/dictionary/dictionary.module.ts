import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DictionaryService } from './dictionary.service';
import { DictionaryController } from './dictionary.controller';
import { DictionaryEntry } from '../entities/dictionary.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DictionaryEntry])],
  controllers: [DictionaryController],
  providers: [DictionaryService],
  exports: [DictionaryService],
})
export class DictionaryModule {}
