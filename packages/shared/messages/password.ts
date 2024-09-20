// SPDX-License-Identifier: MIT

import TelegramBot from 'node-telegram-bot-api';
import { SPECIAL_PREFIXS, TURN_BACK_CALLBACK_DATA_KEYS } from '../constants';

export function sendPasswordMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Please provide a password to secure your wallet:`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
  });
}

export function sendPasswordConfirmationMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Please confirm your password:`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
  });
}

export function sendRequirePasswordMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Please enter your password:`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Forgot Password?',
            callback_data: SPECIAL_PREFIXS.FORGOT_PASSWORD,
          },
        ],
        [
          {
            text: 'Cancel',
            callback_data: TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_START,
          },
        ],
      ],
    },
  });
}

export function sendResetPasswordSuccessMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Your password has been reset successfully!`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Back to wallets',
            callback_data: TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLETS,
          },
        ],
      ],
    },
  });
}

export function sendWrongPasswordConfirmationMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Wrong password confirmation!
  \nPlease try again.`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Cancel',
            callback_data: TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_START,
          },
        ],
      ],
    },
  });
}

export function sendInvalidPasswordMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Invalid password!
  \nPassword must:
  - Be at least *8 characters long*, contain at least one lowercase letter
  - Contain at least *one upercase letter*
  - Contain at least *one number*
  - Contain at least *one special character*
  \nPlease try again.`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
  });
}

export function sendWrongPasswordMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Wrong password!
  \nPlease try again.`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
  });
}
