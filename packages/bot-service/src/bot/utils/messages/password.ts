// SPDX-License-Identifier: MIT

import TelegramBot from 'node-telegram-bot-api';

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
