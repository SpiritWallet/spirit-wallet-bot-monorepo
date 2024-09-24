// SPDX-License-Identifier: MIT

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockDetectionModule } from './blocks-detection/block-detection.module';
import configuration from '@app/shared/configuration';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    MongooseModule.forRoot(configuration().DB_PATH),
    BlockDetectionModule,
    BullModule.forRoot({
      connection: {
        host: configuration().REDIS.HOST,
        port: configuration().REDIS.PORT,
        password: configuration().REDIS.PASSWORD,
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
