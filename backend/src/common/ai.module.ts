import { Module, Global } from '@nestjs/common';
import { AIService } from './services/ai.service';

@Global()
@Module({
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
