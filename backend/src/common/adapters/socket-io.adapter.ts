import { INestApplication, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';
import { RedisService } from '../../services/redis.service';

export class RailwaySocketIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RailwaySocketIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(private readonly app: INestApplication) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    try {
      const redisService = this.app.get(RedisService);
      const { pubClient, subClient } = redisService.getPubSubClients();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Socket.IO Redis adapter connected');
    } catch (err) {
      this.logger.warn(
        `Socket.IO Redis adapter unavailable: ${err instanceof Error ? err.message : err}. Running single-instance mode.`,
      );
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: false,
      },
      transports: ['polling', 'websocket'],
      allowUpgrades: true,
      pingTimeout: 60_000,
      pingInterval: 25_000,
      connectTimeout: 45_000,
      maxHttpBufferSize: 1e7,
    });

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
