// SPDX-License-Identifier: MIT

import { formattedContractAddress } from '@app/shared/utils';
import TelegramBot from 'node-telegram-bot-api';

export function sendNewWalletMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  seedPhrase: string,
  address: string,
) {
  const message = `Your seed phrase is:\n\n${'`'}${seedPhrase}${'`'}
  \nPlease keep it safe and secure. Don't share it with anyone. If you lose it, you will lose access to your wallet and all your assets.
  \n this message will be deleted automatically in 30 seconds.
  \nHere is your wallet address ${'`'}${formattedContractAddress(
    address,
  )}${'`'}.\nWe hope you enjoy using Spirit Wallet! 💖`;
  bot
    .sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' })
    .then((sentMessage) => {
      // Delete the message after 30 seconds
      setTimeout(() => {
        bot.deleteMessage(sentMessage.chat.id, sentMessage.message_id);
      }, 30000);
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

export function sendAlreadyCreatedWalletMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `You already have a wallet!`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
  });
}
