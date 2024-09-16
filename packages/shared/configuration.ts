// SPDX-License-Identifier: MIT

import { config } from 'dotenv';
import fs from 'fs';

config();
config({ path: '../../.env' });
export default () => ({
  DB_PATH: process.env.DB_PATH,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN, //fs.readFileSync('/run/secrets/telegram_bot_token', 'utf8').trim(),
  REDIS: {
    HOST: String(process.env.REDIS_HOST),
    PORT: Number(process.env.REDIS_PORT),
    PASSWORD: String(process.env.REDIS_PASSWORD),
  },
  ENCRYPT_SECRET_KEY: process.env.ENCRYPT_SECRET_KEY,
  PHRASE_TO_PK_PWD: process.env.PHRASE_TO_PK_PWD,
});
