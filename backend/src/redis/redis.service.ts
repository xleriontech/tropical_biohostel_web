import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (url) {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      this.client.connect().catch(() => {
        console.warn('⚠️  Redis not available, caching disabled');
        this.client = null;
      });
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.client) return;
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.client) return;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }
}
