import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from '../entities/quote.entity';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private quotesRepository: Repository<Quote>,
  ) {}

  async getRandomQuote(): Promise<Quote> {
    const quote = await this.quotesRepository
      .createQueryBuilder('quote')
      .orderBy('RANDOM()')
      .getOne();
    
    return quote || { text: 'Code is like humor. When you have to explain it, it’s bad.', author: 'Cory House' } as Quote;
  }
}
