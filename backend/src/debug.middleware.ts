import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DebugMiddleware implements NestMiddleware {
  private logger = new Logger('DebugMiddleware');

  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      const secret = this.configService.get<string>('SUPABASE_JWT_SECRET');
      
      this.logger.log(`[DEBUG] Verifying token: ${token.substring(0, 10)}...`);
      this.logger.log(`[DEBUG] Secret length: ${secret ? secret.length : 'MISSING'}`);

      try {
        const decodedHeader = jwt.decode(token, { complete: true });
        this.logger.log(`[DEBUG] Token Header: ${JSON.stringify(decodedHeader?.header)}`);
      } catch (e) {
        this.logger.error(`[DEBUG] Failed to decode token header: ${e.message}`);
      }

      try {
        jwt.verify(token, secret);
        this.logger.log('[DEBUG] Token Verification SUCCESS (Manual Check)');
      } catch (err) {
        this.logger.error(`[DEBUG] Token Verification FAILED: ${err.message}`);
      }
    } else {
        this.logger.log('[DEBUG] No Authorization header');
    }
    next();
  }
}
