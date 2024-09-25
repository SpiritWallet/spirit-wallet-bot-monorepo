// SPDX-License-Identifier: MIT

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import configuration from '@app/shared/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(configuration().PORTS.ONCHAIN_QUEUE, () => {
    console.log(
      `onchain queue is running on port ${configuration().PORTS.ONCHAIN_QUEUE}`,
    );
  });
}
bootstrap();
