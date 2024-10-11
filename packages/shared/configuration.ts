// SPDX-License-Identifier: MIT

import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';

const TELEGRAM_BOT_TOKEN = fs
  .readFileSync('/run/secrets/telegram_bot_token', 'utf8')
  .trim(); // process.env.TELEGRAM_BOT_TOKEN

const BOT = new TelegramBot(TELEGRAM_BOT_TOKEN);
export default () => ({
  BOT,
  DB_PATH: fs.readFileSync('/run/secrets/db_path', 'utf8').trim(), // process.env.DB_PATH,
  TELEGRAM_BOT_TOKEN,
  PORTS: {
    BOT_SERVICE: Number(
      fs.readFileSync('/run/secrets/bot_service_port', 'utf8').trim(),
    ), // Number(process.env.BOT_SERVICE_PORT),
    ONCHAIN_WORKER: Number(
      fs.readFileSync('/run/secrets/onchain_worker_port', 'utf8').trim(),
    ), // Number(process.env.ONCHAIN_WORKER_PORT),
    ONCHAIN_QUEUE: Number(
      fs.readFileSync('/run/secrets/onchain_queue_port', 'utf8').trim(),
    ), // Number(process.env.ONCHAIN_QUEUE_PORT),
    OFFCHAIN_WORKER: Number(
      fs.readFileSync('/run/secrets/offchain_worker_port', 'utf8').trim(),
    ), // Number(process.env.OFFCHAIN_WORKER_PORT),
  },
  REDIS: {
    HOST: fs.readFileSync('/run/secrets/redis_host', 'utf8').trim(), // String(process.env.REDIS_HOST),
    PORT: Number(fs.readFileSync('/run/secrets/redis_port', 'utf8').trim()), // Number(process.env.REDIS_PORT),
    PASSWORD: fs.readFileSync('/run/secrets/redis_password', 'utf8').trim(),
    // String(process.env.REDIS_PASSWORD),
  },
  IPFS_GATEWAY: fs.readFileSync('/run/secrets/ipfs_gateway', 'utf8').trim(), // process.env.IPFS_GATEWAY,
  BEGIN_BLOCK: Number(
    fs.readFileSync('/run/secrets/begin_block', 'utf8').trim(),
  ), // Number(process.env.BEGIN_BLOCK),
  ENCRYPT_SECRET_KEY: fs
    .readFileSync('/run/secrets/encrypt_secret_key', 'utf8')
    .trim(), // process.env.ENCRYPT_SECRET_KEY,
  PHRASE_TO_PK_PWD: fs
    .readFileSync('/run/secrets/phrase_to_pk_pwd', 'utf8')
    .trim(), // process.env.PHRASE_TO_PK_PWD,
});
