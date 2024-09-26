// SPDX-License-Identifier: MIT

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import configuration from '@app/shared/configuration';
import { MetadataModule } from './metadata/metadata.module';
import { MongooseModule } from '@nestjs/mongoose';

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
    MetadataModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
