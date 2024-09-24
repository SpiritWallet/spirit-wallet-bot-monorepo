// SPDX-License-Identifier: MIT

import { config } from 'dotenv';

config();
config({ path: '../../.env' });
export default () => ({
  DB_PATH: process.env.DB_PATH,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN, //fs.readFileSync('/run/secrets/telegram_bot_token', 'utf8').trim(),
  PORTS: {
    BOT_SERVICE: Number(process.env.BOT_SERVICE_PORT),
    ONCHAIN_WORKER: Number(process.env.ONCHAIN_WORKER_PORT),
  },
  REDIS: {
    HOST: String(process.env.REDIS_HOST),
    PORT: Number(process.env.REDIS_PORT),
    PASSWORD: String(process.env.REDIS_PASSWORD),
  },
  BEGIN_BLOCK: Number(process.env.BEGIN_BLOCK),
  ENCRYPT_SECRET_KEY: process.env.ENCRYPT_SECRET_KEY,
  PHRASE_TO_PK_PWD: process.env.PHRASE_TO_PK_PWD,
});
