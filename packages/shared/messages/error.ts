// SPDX-License-Identifier: MIT

import TelegramBot from 'node-telegram-bot-api';
import { TURN_BACK_CALLBACK_DATA_KEYS } from '../constants';
import { formatEther } from 'ethers';

export function sendErrorMessage(bot: TelegramBot, msg: TelegramBot.Message) {
  const message = `Oops! Something went wrong. Please try again later.`;

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
  const message = `Oops! Deploying your wallet failed. Please try again later.\n\nHere is your transaction hash: [${transactionHash}](https://sepolia.starkscan.co/tx/${transactionHash}).`;

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
    disable_web_page_preview: true,
  });
}

export function sendInvolkeTransactionFailedErrorMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  transactionHash: string,
  encodedAddress: string,
) {
  const message = `Oops! Involke transaction failed. Please try again later.\n\nHere is your transaction hash: [${transactionHash}](https://sepolia.starkscan.co/tx/${transactionHash}).`;

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
    disable_web_page_preview: true,
  });
}

export function sendInvalidReceiverMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  encodedAddress: string,
) {
  const message = `Oops! Invalid receiver address. Please try again.`;

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

export function sendInsufficientErc20BalanceErrorMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  encodedAddress: string,
) {
  const message = `Oops! You don't have enough balance to perform this action\n\nPlease deposit more funds to your wallet or try again.`;

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

export function sendInsufficientNftBalanceErrorMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  encodedAddress: string,
) {
  const message = `Oops! You don't have enough NFT to perform this action\n\nPlease try again.`;

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
    disable_web_page_preview: true,
  });
}

export function sendInvalidAmountMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message,
) {
  const message = `Invalid amount!
  \nPlease enter a valid amount.`;

  bot.sendMessage(msg.chat.id, message, {
    parse_mode: 'Markdown',
  });
}
