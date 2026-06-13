import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';
import { MatchingService } from '../modules/matching/matching.service';
import { ChatMessageRepository } from '../repositories/chat-message.repository';
import { ChatMessageDocument } from '../schemas/chat-message.schema';
import { ReportsService } from '../modules/reports/reports.service';
import { RedisService } from '../services/redis.service';
import { UserRepository } from '../repositories/user.repository';
import { JoinQueueDto } from '../modules/matching/dto/matching.dto';
import { CreateReportDto } from '../modules/reports/dto/report.dto';
import { Types } from 'mongoose';

interface AuthenticatedSocket extends Socket {
  data: { user: { sub: string; email: string; isGuest: boolean } };
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
  transports: ['polling', 'websocket'],
  pingTimeout: 60_000,
  pingInterval: 25_000,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly userSessions = new Map<string, string>();

  constructor(
    private readonly matchingService: MatchingService,
    private readonly chatMessageRepository: ChatMessageRepository,
    private readonly reportsService: ReportsService,
    private readonly redisService: RedisService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      this.logger.warn(`Client ${client.id} rejected: no token`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
      client.data.user = payload;
      await this.redisService.setOnline(payload.sub, client.id);

      const sessionId = this.userSessions.get(payload.sub);
      if (sessionId) {
        await this.redisService.updateSessionSocket(sessionId, payload.sub, client.id);
      }

      this.logger.log(`Client connected: ${client.id} (user ${payload.sub})`);
    } catch {
      this.logger.warn(`Client ${client.id} rejected: invalid token`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data?.user?.sub;
    if (userId) {
      await this.matchingService.leaveQueue(userId);
      const sessionId = this.userSessions.get(userId);
      if (sessionId) {
        await this.notifyPartnerDisconnect(sessionId, userId);
        this.userSessions.delete(userId);
      }
      await this.redisService.removeOnline(userId);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: JoinQueueDto,
  ) {
    const userId = client.data.user.sub;
    await this.redisService.setOnline(userId, client.id);

    const result = await this.matchingService.joinQueue(userId, client.id, dto);

    if (result.matched && result.sessionId && result.partner) {
      this.userSessions.set(userId, result.sessionId);

      const session = await this.redisService.getSession(result.sessionId);
      const partnerSocketId = session?.socket2;

      client.emit('match_found', {
        sessionId: result.sessionId,
        partner: result.partner,
      });

      if (partnerSocketId) {
        const currentUser = await this.userRepository.findById(userId);
        this.server.to(partnerSocketId).emit('match_found', {
          sessionId: result.sessionId,
          partner: {
            id: currentUser?._id.toString(),
            username: currentUser?.username,
            avatar: currentUser?.avatar,
            country: currentUser?.country,
          },
        });

        const partnerUserId = session?.user2;
        if (partnerUserId) {
          this.userSessions.set(partnerUserId, result.sessionId);
        }
      }
    } else {
      const stats = await this.matchingService.getQueueStats();
      client.emit('searching', stats);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('next_user')
  async handleNextUser(@ConnectedSocket() client: AuthenticatedSocket) {
    const userId = client.data.user.sub;
    const sessionId = this.userSessions.get(userId);

    if (sessionId) {
      await this.notifyPartnerDisconnect(sessionId, userId);
      await this.matchingService.endSession(sessionId);
      this.userSessions.delete(userId);
    }

    await this.matchingService.leaveQueue(userId);
    client.emit('searching', await this.matchingService.getQueueStats());
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; content: string },
  ) {
    const userId = client.data.user.sub;
    const sanitized = this.sanitizeInput(data.content);

    const message = await this.chatMessageRepository.create({
      sessionId: data.sessionId,
      senderId: new Types.ObjectId(userId),
      content: sanitized,
    });

    const session = await this.redisService.getSession(data.sessionId);
    if (!session) return;

    const partnerId = session.user1 === userId ? session.user2 : session.user1;
    const partnerSocketId = await this.resolvePartnerSocket(session, partnerId);

    const payload = {
      id: message._id.toString(),
      sessionId: data.sessionId,
      senderId: userId,
      content: sanitized,
      timestamp: (message as ChatMessageDocument & { createdAt: Date }).createdAt,
    };

    client.emit('receive_message', payload);
    if (partnerSocketId) {
      this.server.to(partnerSocketId).emit('receive_message', payload);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; isTyping: boolean },
  ) {
    const userId = client.data.user.sub;
    const session = await this.redisService.getSession(data.sessionId);
    if (!session) return;

    const partnerId = session.user1 === userId ? session.user2 : session.user1;
    const partnerSocketId = await this.resolvePartnerSocket(session, partnerId);

    if (partnerSocketId) {
      this.server.to(partnerSocketId).emit('typing', { sessionId: data.sessionId, isTyping: data.isTyping });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('webrtc_offer')
  handleWebRtcOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; offer: Record<string, unknown> },
  ) {
    this.relayToPartner(client, data.sessionId, 'webrtc_offer', { offer: data.offer });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('webrtc_answer')
  handleWebRtcAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; answer: Record<string, unknown> },
  ) {
    this.relayToPartner(client, data.sessionId, 'webrtc_answer', { answer: data.answer });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('webrtc_ice_candidate')
  handleIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; candidate: Record<string, unknown> },
  ) {
    this.relayToPartner(client, data.sessionId, 'webrtc_ice_candidate', { candidate: data.candidate });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('report_user')
  async handleReportUser(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: CreateReportDto,
  ) {
    const userId = client.data.user.sub;
    const result = await this.reportsService.createReport(userId, data);
    client.emit('report_submitted', result);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('disconnect_user')
  async handleDisconnectUser(@ConnectedSocket() client: AuthenticatedSocket) {
    const userId = client.data.user.sub;
    const sessionId = this.userSessions.get(userId);

    if (sessionId) {
      await this.notifyPartnerDisconnect(sessionId, userId);
      await this.matchingService.endSession(sessionId);
      this.userSessions.delete(userId);
    }

    client.emit('call_ended', { reason: 'user_disconnected' });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('screenshot_detected')
  handleScreenshotDetected(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    this.relayToPartner(client, data.sessionId, 'screenshot_warning', {
      message: 'Your chat partner may have taken a screenshot',
    });
  }

  private async relayToPartner(
    client: AuthenticatedSocket,
    sessionId: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    const userId = client.data.user.sub;
    const session = await this.redisService.getSession(sessionId);
    if (!session) return;

    const partnerId = session.user1 === userId ? session.user2 : session.user1;
    const partnerSocketId = await this.resolvePartnerSocket(session, partnerId);

    if (partnerSocketId) {
      this.server.to(partnerSocketId).emit(event, { sessionId, ...payload });
    }
  }

  private async resolvePartnerSocket(
    session: Record<string, string>,
    partnerId: string,
  ): Promise<string | null> {
    const liveSocketId = await this.redisService.getSocketId(partnerId);
    if (liveSocketId) return liveSocketId;

    if (session.user1 === partnerId) return session.socket1 || null;
    if (session.user2 === partnerId) return session.socket2 || null;
    return null;
  }

  private async notifyPartnerDisconnect(sessionId: string, userId: string) {
    const session = await this.redisService.getSession(sessionId);
    if (!session) return;

    const partnerId = session.user1 === userId ? session.user2 : session.user1;
    const partnerSocketId = await this.resolvePartnerSocket(session, partnerId);

    if (partnerSocketId) {
      this.server.to(partnerSocketId).emit('disconnect_user', { reason: 'partner_left' });
      this.userSessions.delete(partnerId);
    }
  }

  private sanitizeInput(input: string): string {
    return input
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 2000);
  }
}
