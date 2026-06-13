import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface QueueEntry {
  userId: string;
  socketId: string;
  country?: string;
  language?: string;
  gender?: string;
  interests?: string[];
  isPremium: boolean;
  joinedAt: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private connected = false;

  private readonly QUEUE_KEY = 'matchmaking:queue';
  private readonly SESSION_PREFIX = 'session:';
  private readonly ONLINE_PREFIX = 'online:';

  // In-memory fallback when Redis is unavailable
  private readonly memoryQueue: QueueEntry[] = [];
  private readonly memorySessions = new Map<string, Record<string, string>>();
  private readonly memoryOnline = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log('Redis connected');
    });

    this.client.on('error', (err) => {
      this.connected = false;
      this.logger.warn(`Redis error: ${err.message}. Using in-memory fallback.`);
    });

    this.client.connect().catch((err) => {
      this.connected = false;
      this.logger.warn(`Redis connection failed: ${err.message}. Using in-memory fallback.`);
    });
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.client.quit();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  private async ensureConnected(): Promise<boolean> {
    if (this.connected) return true;
    try {
      await this.client.ping();
      this.connected = true;
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async addToQueue(entry: QueueEntry): Promise<void> {
    if (await this.ensureConnected()) {
      const score = entry.isPremium ? entry.joinedAt - 1_000_000 : entry.joinedAt;
      await this.client.zadd(this.QUEUE_KEY, score, JSON.stringify(entry));
      await this.setOnline(entry.userId, entry.socketId);
      return;
    }

    this.memoryQueue.push(entry);
    this.memoryQueue.sort((a, b) => {
      const scoreA = a.isPremium ? a.joinedAt - 1_000_000 : a.joinedAt;
      const scoreB = b.isPremium ? b.joinedAt - 1_000_000 : b.joinedAt;
      return scoreA - scoreB;
    });
    this.memoryOnline.set(entry.userId, entry.socketId);
  }

  async removeFromQueue(userId: string): Promise<void> {
    if (await this.ensureConnected()) {
      const members = await this.client.zrange(this.QUEUE_KEY, 0, -1);
      for (const member of members) {
        const entry = JSON.parse(member) as QueueEntry;
        if (entry.userId === userId) {
          await this.client.zrem(this.QUEUE_KEY, member);
          break;
        }
      }
      await this.removeOnline(userId);
      return;
    }

    const idx = this.memoryQueue.findIndex((e) => e.userId === userId);
    if (idx >= 0) this.memoryQueue.splice(idx, 1);
    this.memoryOnline.delete(userId);
  }

  async findMatch(entry: QueueEntry, blockedIds: string[]): Promise<QueueEntry | null> {
    if (await this.ensureConnected()) {
      const members = await this.client.zrange(this.QUEUE_KEY, 0, -1);
      const blockedSet = new Set(blockedIds);

      for (const member of members) {
        const candidate = JSON.parse(member) as QueueEntry;
        if (candidate.userId === entry.userId) continue;
        if (blockedSet.has(candidate.userId)) continue;
        if (!this.isCompatible(entry, candidate)) continue;

        await this.client.zrem(this.QUEUE_KEY, member);
        await this.removeFromQueue(entry.userId);
        return candidate;
      }
      return null;
    }

    const blockedSet = new Set(blockedIds);
    const idx = this.memoryQueue.findIndex(
      (candidate) =>
        candidate.userId !== entry.userId &&
        !blockedSet.has(candidate.userId) &&
        this.isCompatible(entry, candidate),
    );

    if (idx < 0) return null;

    const [candidate] = this.memoryQueue.splice(idx, 1);
    await this.removeFromQueue(entry.userId);
    return candidate;
  }

  private isCompatible(a: QueueEntry, b: QueueEntry): boolean {
    if (a.country && b.country && a.country !== b.country) return false;
    if (a.interests?.length && b.interests?.length) {
      const overlap = a.interests.some((i) => b.interests?.includes(i));
      if (!overlap) return false;
    }
    return true;
  }

  async getQueueSize(): Promise<number> {
    if (await this.ensureConnected()) {
      return this.client.zcard(this.QUEUE_KEY);
    }
    return this.memoryQueue.length;
  }

  async setSession(sessionId: string, data: Record<string, string>): Promise<void> {
    if (await this.ensureConnected()) {
      await this.client.hset(`${this.SESSION_PREFIX}${sessionId}`, data);
      await this.client.expire(`${this.SESSION_PREFIX}${sessionId}`, 3600);
      return;
    }
    this.memorySessions.set(sessionId, data);
  }

  async getSession(sessionId: string): Promise<Record<string, string> | null> {
    if (await this.ensureConnected()) {
      const data = await this.client.hgetall(`${this.SESSION_PREFIX}${sessionId}`);
      return Object.keys(data).length ? data : null;
    }
    return this.memorySessions.get(sessionId) ?? null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (await this.ensureConnected()) {
      await this.client.del(`${this.SESSION_PREFIX}${sessionId}`);
      return;
    }
    this.memorySessions.delete(sessionId);
  }

  async setOnline(userId: string, socketId: string): Promise<void> {
    if (await this.ensureConnected()) {
      await this.client.set(`${this.ONLINE_PREFIX}${userId}`, socketId, 'EX', 300);
      return;
    }
    this.memoryOnline.set(userId, socketId);
  }

  async getSocketId(userId: string): Promise<string | null> {
    if (await this.ensureConnected()) {
      return this.client.get(`${this.ONLINE_PREFIX}${userId}`);
    }
    return this.memoryOnline.get(userId) ?? null;
  }

  async removeOnline(userId: string): Promise<void> {
    if (await this.ensureConnected()) {
      await this.client.del(`${this.ONLINE_PREFIX}${userId}`);
      return;
    }
    this.memoryOnline.delete(userId);
  }

  async getOnlineCount(): Promise<number> {
    if (await this.ensureConnected()) {
      const keys = await this.client.keys(`${this.ONLINE_PREFIX}*`);
      return keys.length;
    }
    return this.memoryOnline.size;
  }
}
