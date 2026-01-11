import { Test, TestingModule } from '@nestjs/testing';
import { CodeRunnerService } from './code-runner.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CodeRunnerService', () => {
  let service: CodeRunnerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodeRunnerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://mock-piston.com'),
          },
        },
      ],
    }).compile();

    service = module.get<CodeRunnerService>(CodeRunnerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should execute code successfully', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        run: {
          stdout: 'Hello World',
          stderr: '',
          output: 'Hello World',
          code: 0,
          signal: null,
        },
      },
    });

    const result = await service.executeCode('python', 'print("Hello World")');
    expect(result.stdout).toBe('Hello World');
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  it('should handle execution error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));

    await expect(
      service.executeCode('python', 'print("Hello World")'),
    ).rejects.toThrow('Code execution failed');
  });
});
