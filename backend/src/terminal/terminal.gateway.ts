import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { TerminalService } from './terminal.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true })
export class TerminalGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(TerminalGateway.name);
  constructor(private readonly terminalService: TerminalService) {}

  @SubscribeMessage('run')
  handleRun(@MessageBody() data: { language: string; code: string }, @ConnectedSocket() client: Socket) {
    // Kill existing session if any
    this.terminalService.killSession(client.id);

    this.terminalService.startSession(
      client.id,
      data.language,
      data.code,
      (output) => client.emit('output', output),
      (code) => client.emit('exit', code)
    );
  }

  @SubscribeMessage('input')
  handleInput(@MessageBody() data: string, @ConnectedSocket() client: Socket) {
    this.logger.debug(`Input from ${client.id}: ${JSON.stringify(data)}`);
    this.terminalService.handleInput(client.id, data);
  }

  @SubscribeMessage('resize')
  handleResize(@MessageBody() data: { cols: number; rows: number }, @ConnectedSocket() client: Socket) {
    this.terminalService.resizeSession(client.id, data.cols, data.rows);
  }

  handleDisconnect(client: Socket) {
    this.terminalService.killSession(client.id);
  }
}
