// SPDX-License-Identifier: MIT

import configuration from '@app/shared/configuration';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: configuration().REDIS.HOST,
      port: configuration().REDIS.PORT,
      password: configuration().REDIS.PASSWORD,
    });

    this.client.on('error', (err) => {
      console.error('Redis error', err);
    });
  }

  async get(key: string) {
    return await this.client.get(key);
  }

  async set(key: string, value: string) {
    return await this.client.set(key, value, 'EX', 60 * 60);
  }
  async del(key: string) {
    return await this.client.del(key);
  }
}
