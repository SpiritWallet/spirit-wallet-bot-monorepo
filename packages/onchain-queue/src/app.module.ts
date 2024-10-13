// SPDX-License-Identifier: MIT

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import configuration from '@app/shared/configuration';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Erc1155BurnQueueModule,
  Erc1155MintQueueModule,
  Erc1155TransferQueueModule,
  Erc721BurnQueueModule,
  Erc721MintQueueModule,
  Erc721TransferQueueModule,
} from './queues';
import {
  Erc20BurnQueueModule,
  Erc20MintQueueModule,
  Erc20TransferQueueModule,
} from './queues/erc20';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRoot(configuration().DB_PATH),
    BullModule.forRoot({
      redis: {
        host: configuration().REDIS.HOST,
        port: configuration().REDIS.PORT,
        password: configuration().REDIS.PASSWORD,
      },
    }),

    Erc20BurnQueueModule,
    Erc20MintQueueModule,
    Erc20TransferQueueModule,
    Erc721BurnQueueModule,
    Erc721MintQueueModule,
    Erc721TransferQueueModule,
    Erc1155BurnQueueModule,
    Erc1155MintQueueModule,
    Erc1155TransferQueueModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
