// SPDX-License-Identifier: MIT

import { config } from 'dotenv';

config();
config({ path: '../../.env' });
export default () => ({
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
});
