// SPDX-License-Identifier: MIT

import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { config } from 'dotenv';

config({ path: '../../.env' });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // process.env.TELEGRAM_BOT_TOKEN

const BOT = new TelegramBot(TELEGRAM_BOT_TOKEN);
export default () => ({
  BOT,
  DB_PATH: process.env.DB_PATH, // process.env.DB_PATH,
  TELEGRAM_BOT_TOKEN,
  PORTS: {
    BOT_SERVICE: Number(process.env.BOT_SERVICE_PORT), // Number(process.env.BOT_SERVICE_PORT),
    ONCHAIN_WORKER: Number(process.env.ONCHAIN_WORKER_PORT), // Number(process.env.ONCHAIN_WORKER_PORT),
    ONCHAIN_QUEUE: Number(process.env.ONCHAIN_QUEUE_PORT), // Number(process.env.ONCHAIN_QUEUE_PORT),
    OFFCHAIN_WORKER: Number(process.env.OFFCHAIN_WORKER_PORT), // Number(process.env.OFFCHAIN_WORKER_PORT),
  },
  REDIS: {
    HOST: process.env.REDIS_HOST, // String(process.env.REDIS_HOST),
    PORT: Number(process.env.REDIS_PORT), // Number(process.env.REDIS_PORT),
    PASSWORD: process.env.REDIS_PASSWORD,
    // String(process.env.REDIS_PASSWORD),
  },
  IPFS_GATEWAY: process.env.IPFS_GATEWAY, // process.env.IPFS_GATEWAY,
  BEGIN_BLOCK: Number(process.env.BEGIN_BLOCK), // Number(process.env.BEGIN_BLOCK),
  ENCRYPT_SECRET_KEY: process.env.ENCRYPT_SECRET_KEY, // process.env.ENCRYPT_SECRET_KEY,
  PHRASE_TO_PK_PWD: process.env.PHRASE_TO_PK_PWD, // process.env.PHRASE_TO_PK_PWD,
});
