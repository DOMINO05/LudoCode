import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedSnippet } from './snippet.entity';
import { CodeRunnerService } from '../code-runner/code-runner.service';

@Injectable()
export class SnippetsService {
  constructor(
    @InjectRepository(SharedSnippet)
    private snippetsRepository: Repository<SharedSnippet>,
    private codeRunnerService: CodeRunnerService,
  ) {}

  async createSnippet(data: Partial<SharedSnippet>, user?: any): Promise<SharedSnippet> {
    const snippet = this.snippetsRepository.create({
      ...data,
      creatorId: user ? user.userId : null,
    });
    
    // We save first. The database trigger will generate the share_code.
    // However, TypeORM doesn't automatically fetch trigger-generated values unless configured or reloaded.
    const saved = await this.snippetsRepository.save(snippet);
    
    // Reload to get the share_code
    return this.snippetsRepository.findOne({ where: { id: saved.id } });
  }

  async getSnippet(shareCode: string): Promise<SharedSnippet> {
    const snippet = await this.snippetsRepository.findOne({
      where: { shareCode },
      relations: ['creator'],
    });
    if (!snippet) {
      throw new NotFoundException('Snippet not found');
    }
    return snippet;
  }

  async runCode(language: string, code: string) {
    return this.codeRunnerService.executeCode(language, code);
  }

  async updateSnippet(shareCode: string, data: { code: string; language: string }): Promise<SharedSnippet> {
    const snippet = await this.getSnippet(shareCode);
    
    if (!snippet.isEditable) {
      throw new ForbiddenException('This snippet is read-only');
    }

    snippet.code = data.code;
    snippet.language = data.language;
    return this.snippetsRepository.save(snippet);
  }
}
