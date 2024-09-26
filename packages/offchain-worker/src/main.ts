// SPDX-License-Identifier: MIT

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import configuration from '@app/shared/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(configuration().PORTS.OFFCHAIN_WORKER, () => {
    console.log(
      `offchain worker is running on port ${configuration().PORTS.OFFCHAIN_WORKER}`,
    );
  });
}
bootstrap();
