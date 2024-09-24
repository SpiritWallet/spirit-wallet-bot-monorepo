// SPDX-License-Identifier: MIT

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import configuration from '@app/shared/configuration';
import { ValidationPipe } from '@nestjs/common';

import { configureValidation } from '@app/shared/config';
// import { AppClusterService } from '@app/shared/modules/cluster/app_cluster.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureValidation(app);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  await app.listen(configuration().PORTS.BOT_SERVICE, () => {
    console.log(
      `Spirit Wallet Bot service is running on port ${configuration().PORTS.BOT_SERVICE}`,
    );
  });
}
// AppClusterService.clusterize(bootstrap);
bootstrap();
