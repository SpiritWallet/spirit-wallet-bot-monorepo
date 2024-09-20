// SPDX-License-Identifier: MIT

import { TURN_BACK_CALLBACK_DATA_KEYS } from '../constants';
import { WalletAction } from '../types';
import { formattedContractAddress } from '../utils';
import TelegramBot from 'node-telegram-bot-api';

export function sendOptiontoCreateNewWalletMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Create a new wallet or restore an existing wallet?`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Create a new wallet',
            callback_data: WalletAction.CreateNewWallet,
          },
        ],
        [
          {
            text: 'Restore an existing wallet',
            callback_data: WalletAction.RestoreWallet,
          },
        ],
      ],
    },
  });
}

export function askImportSeedPhraseMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Please enter your seed phrase:`;

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

export function sendRequireSeedPhraseMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Before resetting your password, you need to provide your seed phrase:
  \n\nPlease enter your seed phrase:`;

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

export function sendInvalidSeedPhraseMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Invalid seed phrase!
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

export function sendMissMatchSeedPhraseMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Your seed phrase is not matching!
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

export function sendNewWalletMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  seedPhrase: string,
  address: string,
) {
  const message = `Your seed phrase is:\n\n${'`'}${seedPhrase}${'`'}
  \nPlease keep it safe and secure. Don't share it with anyone. If you lose it, you will lose access to your wallet and all your assets.
  \n this message will be deleted automatically in 30 seconds.
  \nHere is your first wallet address ${'`'}${formattedContractAddress(
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

export function sendImportedWalletMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  address: string,
) {
  const message = `Restored wallet successfully!\n\nYour first wallet is:\n\n${'`'}${address}${'`'}\n\nWe hope you enjoy using Spirit Wallet! 💖`;
  bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
}

export function sendAlreadyCreatedWalletMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `You already have a wallet!\n\nYou can manage your wallets by using the /mywallets command.`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
  });
}
