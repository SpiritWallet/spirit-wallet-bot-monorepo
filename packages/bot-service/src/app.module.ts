// SPDX-License-Identifier: MIT

import { Module, MiddlewareConsumer } from '@nestjs/common';
import { AppLoggerMiddleware } from '@app/shared/middlewares/app-logger.middleware';
import configuration from '@app/shared/configuration';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRoot(configuration().DB_PATH),
    BotModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AppLoggerMiddleware).forRoutes('*');
  }
}
