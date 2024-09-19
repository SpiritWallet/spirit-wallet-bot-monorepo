// SPDX-License-Identifier: MIT

import TelegramBot from 'node-telegram-bot-api';
import { TURN_BACK_CALLBACK_DATA_KEYS } from '../constants';
import { formatEther } from 'ethers';

export function sendErrorMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  encodedAddress: string,
) {
  const message = `Oops! Something went wrong. Please try again later.`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Back to wallet functions',
            callback_data:
              TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLET_FUNCTIONS +
              encodedAddress,
          },
        ],
      ],
    },
  });
}

export function sendInsufficientBalanceErrorMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  balanceNeeded: string,
  encodedAddress: string,
) {
  const message = `Oops! You don't have enough balance to perform this action\n\nNeed ${'*'}${formatEther(balanceNeeded)}${'*'} $ETH to perform this action.\n\nPlease deposit more funds to your wallet and try again.`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Back to wallet functions',
            callback_data:
              TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLET_FUNCTIONS +
              encodedAddress,
          },
        ],
      ],
    },
  });
}

export function sendDeployWalletFailedErrorMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  transactionHash: string,
  encodedAddress: string,
) {
  const message = `Oops! Deploying your wallet failed. Please try again later.\n\nHere is your transaction hash: ${'`'}${transactionHash}${'`'}.`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Back to wallet functions',
            callback_data:
              TURN_BACK_CALLBACK_DATA_KEYS.BACK_TO_WALLET_FUNCTIONS +
              encodedAddress,
          },
        ],
      ],
    },
  });
}
