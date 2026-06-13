import { Injectable, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RedisService, QueueEntry } from '../../services/redis.service';
import { UserRepository } from '../../repositories/user.repository';
import { JoinQueueDto } from './dto/matching.dto';

const FREE_DAILY_MATCH_LIMIT = 10;

@Injectable()
export class MatchingService {
  constructor(
    private readonly redisService: RedisService,
    private readonly userRepository: UserRepository,
  ) {}

  async joinQueue(
    userId: string,
    socketId: string,
    dto: JoinQueueDto,
  ): Promise<{ matched: boolean; sessionId?: string; partner?: Record<string, unknown> }> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new ForbiddenException('User not found');

    if (!user.isPremium) {
      await this.checkDailyLimit(user);
    }

    const entry: QueueEntry = {
      userId,
      socketId,
      country: dto.country,
      language: dto.language,
      gender: dto.gender,
      interests: dto.interests,
      isPremium: user.isPremium,
      joinedAt: Date.now(),
    };

    const blockedIds = user.blockedUsers.map((id) => id.toString());
    const match = await this.redisService.findMatch(entry, blockedIds);

    if (match) {
      const sessionId = uuidv4();
      const partner = await this.userRepository.findById(match.userId);

      await this.redisService.setSession(sessionId, {
        user1: userId,
        user2: match.userId,
        socket1: socketId,
        socket2: match.socketId,
      });

      if (!user.isPremium) {
        await this.userRepository.update(userId, {
          dailyMatchCount: user.dailyMatchCount + 1,
        });
      }

      return {
        matched: true,
        sessionId,
        partner: {
          id: partner?._id.toString(),
          username: partner?.username,
          avatar: partner?.avatar,
          country: partner?.country,
        },
      };
    }

    await this.redisService.addToQueue(entry);
    return { matched: false };
  }

  async leaveQueue(userId: string): Promise<void> {
    await this.redisService.removeFromQueue(userId);
  }

  async getQueueStats() {
    const [queueSize, onlineCount] = await Promise.all([
      this.redisService.getQueueSize(),
      this.redisService.getOnlineCount(),
    ]);

    const estimatedWait = queueSize > 0 ? Math.ceil(queueSize / 2) * 3 : 5;
    return { queueSize, onlineCount, estimatedWaitSeconds: estimatedWait };
  }

  async endSession(sessionId: string): Promise<void> {
    await this.redisService.deleteSession(sessionId);
  }

  private async checkDailyLimit(user: { _id: { toString(): string }; dailyMatchCount: number; lastMatchResetAt?: Date }) {
    const now = new Date();
    const lastReset = user.lastMatchResetAt || new Date(0);
    const isNewDay = now.toDateString() !== lastReset.toDateString();

    if (isNewDay) {
      await this.userRepository.update(user._id.toString(), {
        dailyMatchCount: 0,
        lastMatchResetAt: now,
      });
      return;
    }

    if (user.dailyMatchCount >= FREE_DAILY_MATCH_LIMIT) {
      throw new ForbiddenException('Daily match limit reached. Upgrade to Premium for unlimited matches.');
    }
  }
}
